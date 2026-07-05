import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };
  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (to, resetUrl) => {
  await sendEmail({
    to,
    subject: 'Nexus – Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset</h2>
        <p>You requested a password reset for your Nexus account.</p>
        <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
        <a href="${resetUrl}" 
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:14px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

export const sendOTPEmail = async (to, otp) => {
  await sendEmail({
    to,
    subject: 'Nexus – Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Two-Factor Authentication</h2>
        <p>Your one-time verification code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;margin:20px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:14px;">This code expires in ${process.env.OTP_TTL || 10} minutes.</p>
      </div>
    `,
  });
};
