import { body } from 'express-validator';

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['entrepreneur', 'investor'])
    .withMessage("Role must be 'entrepreneur' or 'investor'"),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

export const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('bio').optional().isLength({ max: 500 }),
  body('location').optional().isLength({ max: 200 }),
];

export const meetingValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('scheduledAt')
    .isISO8601()
    .withMessage('Valid scheduled date/time required')
    .custom((val) => {
      if (new Date(val) <= new Date()) throw new Error('Meeting must be scheduled in the future');
      return true;
    }),
  body('duration').optional().isInt({ min: 15, max: 480 }),
];

export const paymentValidator = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
];

export const otpValidator = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
];

export const verifyOtpValidator = [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];
