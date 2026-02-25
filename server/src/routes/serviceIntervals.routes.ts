import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createServiceIntervalSchema, updateServiceIntervalSchema } from '../validators/service.validator';

const router = Router();

router.use(authenticate);

router.get('/', serviceController.listServiceIntervals);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), validate(createServiceIntervalSchema), serviceController.createServiceInterval);
router.patch('/:id', authorize('ADMIN', 'FLEET_MANAGER'), validate(updateServiceIntervalSchema), serviceController.updateServiceInterval);
router.delete('/:id', authorize('ADMIN', 'FLEET_MANAGER'), serviceController.deleteServiceInterval);

export default router;
