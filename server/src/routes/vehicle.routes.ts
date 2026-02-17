import { Router } from 'express';
import * as vehicleController from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema, updateKilometersSchema } from '../validators/vehicle.validator';

const router = Router();

router.use(authenticate);

router.get('/', vehicleController.listVehicles);
router.get('/:id/costs', vehicleController.getVehicleCosts);
router.get('/:id', vehicleController.getVehicleById);
router.post('/', authorize('ADMIN', 'FLEET_MANAGER'), validate(createVehicleSchema), vehicleController.createVehicle);
router.patch('/:id', authorize('ADMIN', 'FLEET_MANAGER'), validate(updateVehicleSchema), vehicleController.updateVehicle);
router.delete('/:id', authorize('ADMIN'), vehicleController.deleteVehicle);
router.patch('/:id/kilometers', validate(updateKilometersSchema), vehicleController.updateKilometers);

export default router;
