import { z } from 'zod';

export const createAssignmentSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required'),
  startDate: z.string().min(1, 'Start date is required'),
  notes: z.string().optional(),
});
