import { Router } from 'express';
import * as driverController from '../controllers/driver.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createDriverSchema, updateDriverSchema } from '../validators/driver.validator';

const router = Router();

router.use(authenticate);

router.get('/', driverController.listDrivers);
router.get('/:id/costs', driverController.getDriverCosts);
router.get('/:id', driverController.getDriverById);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), validate(createDriverSchema), driverController.createDriver);
router.patch('/:id', authorize('ADMIN', 'FLEET_MANAGER'), validate(updateDriverSchema), driverController.updateDriver);
router.delete('/:id', authorize('ADMIN'), driverController.deleteDriver);

export default router;
