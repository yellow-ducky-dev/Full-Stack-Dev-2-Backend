import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, logout } from '../controllers/authController.js';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../middleware/validate.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerValidator, handleValidationErrors, register);
router.post('/login', loginValidator, handleValidationErrors, login);
router.post('/forgot-password', forgotPasswordValidator, handleValidationErrors, forgotPassword);
router.post('/reset-password', resetPasswordValidator, handleValidationErrors, resetPassword);
router.post('/logout', protect, logout);

export default router;
