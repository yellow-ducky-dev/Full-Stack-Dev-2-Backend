import OTP from '../models/OTP.js';
import User from '../models/User.js';
import { generateOTP, generateAccessToken } from '../utils/tokens.js';
import { sendOTPEmail } from '../utils/email.js';

// @route  POST /api/2fa/send-otp
export const sendOtp = async (req, res) => {
  try {
    const { email, purpose = 'login-2fa' } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Invalidate old OTPs
    await OTP.deleteMany({ userId: user._id, purpose });

    const otp = generateOTP();
    const ttl = parseInt(process.env.OTP_TTL || '10');

    await OTP.create({
      userId: user._id,
      email,
      otp,
      purpose,
      expiresAt: new Date(Date.now() + ttl * 60 * 1000),
    });

    await sendOTPEmail(email, otp);
    res.json({ message: `OTP sent to ${email}. Valid for ${ttl} minutes.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/2fa/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, purpose = 'login-2fa' } = req.body;

    const record = await OTP.findOne({
      email,
      otp,
      purpose,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    record.used = true;
    await record.save();

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.isOnline = true;
    await user.save();

    const token = generateAccessToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  PUT /api/2fa/toggle
export const toggle2FA = async (req, res) => {
  try {
    req.user.isTwoFAEnabled = !req.user.isTwoFAEnabled;
    await req.user.save();
    res.json({
      isTwoFAEnabled: req.user.isTwoFAEnabled,
      message: `2FA has been ${req.user.isTwoFAEnabled ? 'enabled' : 'disabled'}.`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
