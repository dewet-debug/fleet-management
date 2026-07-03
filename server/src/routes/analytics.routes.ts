import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/profitability', analyticsController.vehicleProfitability);
router.get('/driver-performance', analyticsController.driverPerformance);

export default router;
