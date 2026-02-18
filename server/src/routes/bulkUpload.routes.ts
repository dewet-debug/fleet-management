import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { uploadExcel } from '../middleware/upload';
import * as bulkUploadController from '../controllers/bulkUpload.controller';

const router = Router();

router.use(authenticate);

router.get('/templates/:type', bulkUploadController.downloadTemplate);

router.post('/vehicles', authorize('ADMIN', 'FLEET_MANAGER'), uploadExcel, bulkUploadController.uploadVehicles);
router.post('/drivers', authorize('ADMIN', 'FLEET_MANAGER'), uploadExcel, bulkUploadController.uploadDrivers);
router.post('/services', authorize('ADMIN', 'FLEET_MANAGER'), uploadExcel, bulkUploadController.uploadServices);
router.post('/assignments', authorize('ADMIN', 'FLEET_MANAGER'), uploadExcel, bulkUploadController.uploadAssignments);

export default router;
