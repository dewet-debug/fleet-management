import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { getReportCatalog, getReport } from '../controllers/reports.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'FLEET_MANAGER'));

router.get('/', getReportCatalog);
router.get('/:key', getReport);

export default router;
