import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createServiceTypeSchema, updateServiceTypeSchema } from '../validators/service.validator';

const router = Router();

router.use(authenticate);

router.get('/', serviceController.listServiceTypes);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), validate(createServiceTypeSchema), serviceController.createServiceType);
router.patch('/:id', authorize('ADMIN', 'FLEET_MANAGER'), validate(updateServiceTypeSchema), serviceController.updateServiceType);
router.delete('/:id', authorize('ADMIN', 'FLEET_MANAGER'), serviceController.deleteServiceType);

export default router;
