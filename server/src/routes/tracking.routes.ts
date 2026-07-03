import { Router } from 'express';
import * as trackingController from '../controllers/tracking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/positions', trackingController.fleetPositions);

export default router;
