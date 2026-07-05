import { Router } from 'express';
import { sendOtp, verifyOtp, toggle2FA } from '../controllers/twoFAController.js';
import { protect } from '../middleware/auth.js';
import { otpValidator, verifyOtpValidator } from '../middleware/validate.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';

const router = Router();

// Public (used during login flow before JWT is issued)
router.post('/send-otp', otpValidator, handleValidationErrors, sendOtp);
router.post('/verify-otp', verifyOtpValidator, handleValidationErrors, verifyOtp);

// Protected (toggle 2FA setting in profile)
router.put('/toggle', protect, toggle2FA);

export default router;
