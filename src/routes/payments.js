import { Router } from 'express';
import {
  deposit,
  withdraw,
  transfer,
  getTransactions,
  createPaymentIntent,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { paymentValidator } from '../middleware/validate.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';

const router = Router();
router.use(protect);

router.post('/create-intent', paymentValidator, handleValidationErrors, createPaymentIntent);
router.post('/deposit', paymentValidator, handleValidationErrors, deposit);
router.post('/withdraw', paymentValidator, handleValidationErrors, withdraw);
router.post('/transfer', paymentValidator, handleValidationErrors, transfer);
router.get('/transactions', getTransactions);

export default router;
