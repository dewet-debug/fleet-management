import { Router } from 'express';
import * as a49Controller from '../controllers/a49.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// Sync endpoints (admin/fleet manager only)
router.post('/sync', authorize('ADMIN', 'FLEET_MANAGER'), a49Controller.syncAll);
router.post('/sync/drivers', authorize('ADMIN', 'FLEET_MANAGER'), a49Controller.syncDrivers);
router.post('/sync/job-cards', authorize('ADMIN', 'FLEET_MANAGER'), a49Controller.syncJobCards);

// Data endpoints
router.get('/drivers', a49Controller.listDrivers);
router.get('/job-cards', a49Controller.listJobCards);
router.get('/sync-logs', a49Controller.listSyncLogs);

export default router;
