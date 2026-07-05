import User from '../models/User.js';
import { generateAccessToken, generateResetToken } from '../utils/tokens.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import crypto from 'crypto';

// @route  POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role, startupName, industry } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
      startupName: role === 'entrepreneur' ? startupName || '' : undefined,
      industry: role === 'entrepreneur' ? industry || '' : undefined,
    });

    const token = generateAccessToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // If 2FA is enabled, don't issue token yet – UI should call /api/2fa/send-otp
    if (user.isTwoFAEnabled) {
      return res.status(200).json({
        requires2FA: true,
        userId: user._id,
        message: 'OTP required. Please verify your identity.',
      });
    }

    user.isOnline = true;
    await user.save();

    const token = generateAccessToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const rawToken = generateResetToken();
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + parseInt(process.env.RESET_TOKEN_TTL || '30') * 60 * 1000
    );
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: 'Password reset email sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  POST /api/auth/logout  (just for online status)
export const logout = async (req, res) => {
  try {
    if (req.user) {
      req.user.isOnline = false;
      await req.user.save();
    }
    res.json({ message: 'Logged out.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
