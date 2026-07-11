import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  updateCartrackConfigSchema,
  testConnectionSchema,
  addFleetVehicleSchema,
  bulkAddFleetVehiclesSchema,
  triggerSyncSchema,
} from '../validators/cartrack.validator';
import * as cartrackController from '../controllers/cartrack.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// Config
router.get('/config', cartrackController.getConfig);
router.patch('/config', validate(updateCartrackConfigSchema), cartrackController.updateConfig);
router.post('/config/test-connection', validate(testConnectionSchema), cartrackController.testConnection);

// Fleet vehicle registry
router.get('/fleet-vehicles', cartrackController.getFleetVehicles);
router.post('/fleet-vehicles', validate(addFleetVehicleSchema), cartrackController.addFleetVehicle);
router.post('/fleet-vehicles/bulk', validate(bulkAddFleetVehiclesSchema), cartrackController.bulkAddFleetVehicles);
router.delete('/fleet-vehicles/:id', cartrackController.removeFleetVehicle);

// Sync operations
router.post('/sync', validate(triggerSyncSchema), cartrackController.triggerSync);
router.get('/sync/status', cartrackController.getSchedulerStatus);
router.get('/sync/logs', cartrackController.getSyncLogs);
router.get('/sync/logs/:id', cartrackController.getSyncLogById);

// Synced data views
router.get('/vehicles/:id/data', cartrackController.getVehicleData);
router.get('/vehicles/:id/trips', cartrackController.getVehicleTrips);
router.get('/vehicles/:id/alerts', cartrackController.getVehicleAlerts);
router.get('/vehicles/:id/fuel', cartrackController.getVehicleFuel);
router.get('/drivers', cartrackController.getDrivers);
router.get('/vehicle-groups', cartrackController.getVehicleGroups);

// Extended synced-data views
router.get('/coaching-events', cartrackController.getCoachingEvents);
router.get('/geofences', cartrackController.getGeofences);
router.get('/geofence-visits', cartrackController.getGeofenceVisits);
router.get('/vehicle-events', cartrackController.getVehicleEvents);
router.get('/reminders', cartrackController.getReminders);
router.get('/pois', cartrackController.getPois);

export default router;
