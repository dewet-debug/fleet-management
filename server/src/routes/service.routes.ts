import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createServiceRecordSchema, updateServiceRecordSchema, transitionServiceSchema, bulkDeleteServiceRecordsSchema } from '../validators/service.validator';

const router = Router();

router.use(authenticate);

router.get('/', serviceController.listServiceRecords);
router.get('/:id', serviceController.getServiceRecordById);
router.post('/bulk-delete', authorize('ADMIN', 'FLEET_MANAGER'), validate(bulkDeleteServiceRecordsSchema), serviceController.bulkDeleteServiceRecords);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), validate(createServiceRecordSchema), serviceController.createServiceRecord);
router.patch('/:id', authorize('ADMIN', 'FLEET_MANAGER'), validate(updateServiceRecordSchema), serviceController.updateServiceRecord);
router.post('/:id/transition', validate(transitionServiceSchema), serviceController.transitionServiceRecord);

export default router;
