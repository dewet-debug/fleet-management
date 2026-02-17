import { Router } from 'express';
import { uploadPhoto, getPhotoFile, deletePhotoHandler } from '../controllers/uploads.controller';
import { authenticate } from '../middleware/auth';
import { uploadSinglePhoto } from '../middleware/upload';

const router = Router();

router.post('/photos', authenticate, uploadSinglePhoto, uploadPhoto);
router.get('/photos/:filename', getPhotoFile);
router.delete('/photos/:id', authenticate, deletePhotoHandler);

export default router;
