import { Router } from 'express';
import { getMe, getUsers, getUserById, updateUser, updateAvatar } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { updateProfileValidator } from '../middleware/validate.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';

const router = Router();

router.use(protect); // all user routes require authentication

router.get('/me', getMe);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/me/avatar', updateAvatar);
router.put('/:id', updateProfileValidator, handleValidationErrors, updateUser);

export default router;
