import { Router } from 'express';
import * as boltController from '../controllers/bolt.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/status', boltController.status);
router.get('/trips', boltController.listTrips);
router.get('/trips/summary', boltController.tripsSummary);
router.get('/trips/analytics', boltController.tripsAnalytics);
router.get('/sync-logs', boltController.listSyncLogs);

// Trigger a Bolt trip download for a date range (admin / fleet manager only)
router.post('/trips/sync', authorize('ADMIN', 'FLEET_MANAGER'), boltController.triggerSync);

export default router;
