import { Router } from 'express';
import * as boltController from '../controllers/bolt.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/trips', boltController.listTrips);
router.get('/trips/summary', boltController.tripsSummary);
router.get('/trips/analytics', boltController.tripsAnalytics);
router.get('/sync-logs', boltController.listSyncLogs);

export default router;
