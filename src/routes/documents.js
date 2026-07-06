import { Router } from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  toggleShare,
  signDocument,
  downloadDocument
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

const router = Router();

// Unprotected for easy browser viewing without passing auth headers manually
router.get('/:id/download', downloadDocument);

router.use(protect);

router.post('/upload', upload.single('document'), uploadDocument);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);
router.put('/:id/share', toggleShare);
router.put('/:id/sign', signDocument);

export default router;
