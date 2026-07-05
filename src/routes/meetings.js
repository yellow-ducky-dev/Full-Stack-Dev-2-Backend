import { Router } from 'express';
import {
  createMeeting,
  getMeetings,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meetingController.js';
import { protect } from '../middleware/auth.js';
import { meetingValidator } from '../middleware/validate.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';

const router = Router();

router.use(protect);

router.post('/', meetingValidator, handleValidationErrors, createMeeting);
router.get('/', getMeetings);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

export default router;
