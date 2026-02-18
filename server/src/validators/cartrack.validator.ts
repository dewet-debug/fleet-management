import { z } from 'zod';

export const updateCartrackConfigSchema = z.object({
  apiBaseUrl: z.string().url().optional(),
  apiUsername: z.string().min(1).optional(),
  apiPassword: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  vehicleSyncEnabled: z.boolean().optional(),
  tripSyncEnabled: z.boolean().optional(),
  driverSyncEnabled: z.boolean().optional(),
  alertSyncEnabled: z.boolean().optional(),
  fuelSyncEnabled: z.boolean().optional(),
});

export const addFleetVehicleSchema = z.object({
  vehicleId: z.string().min(1),
  licensePlate: z.string().min(1),
});

export const bulkAddFleetVehiclesSchema = z.object({
  vehicles: z.array(z.object({
    vehicleId: z.string().min(1),
    licensePlate: z.string().min(1),
  })).min(1),
});

export const triggerSyncSchema = z.object({
  syncType: z.enum(['FULL', 'VEHICLES', 'TRIPS', 'DRIVERS', 'DRIVER_LINKAGE', 'ALERTS', 'FUEL', 'VEHICLE_GROUPS']),
});
