import { z } from 'zod';

export const createServiceTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  estimatedDuration: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateServiceTypeSchema = createServiceTypeSchema.partial();

export const createServiceIntervalSchema = z.object({
  serviceTypeId: z.string().uuid(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  kilometerInterval: z.number().int().positive().optional(),
  timeIntervalDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const updateServiceIntervalSchema = createServiceIntervalSchema.partial();

export const createServiceRecordSchema = z.object({
  vehicleId: z.string().uuid(),
  serviceProviderId: z.string().uuid().optional(),
  serviceTypeConfigId: z.string().uuid(),
  description: z.string().min(1),
  scheduledDate: z.string().optional(),
  laborCost: z.number().nonnegative().optional(),
  partsCost: z.number().nonnegative().optional(),
  additionalCharges: z.number().nonnegative().optional(),
  vatAmount: z.number().nonnegative().optional(),
  totalCostExclVat: z.number().nonnegative().optional(),
  totalCostInclVat: z.number().nonnegative().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  isWarrantyClaim: z.boolean().optional(),
  driverId: z.string().optional(),
  currency: z.string().min(1).optional(),
  kilometersAtService: z.number().int().positive().optional(),
  conditionBefore: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).optional(),
  internalNotes: z.string().optional(),
});

export const updateServiceRecordSchema = z.object({
  description: z.string().optional(),
  serviceProviderId: z.string().uuid().optional().nullable(),
  scheduledDate: z.string().optional(),
  laborCost: z.number().nonnegative().optional(),
  partsCost: z.number().nonnegative().optional(),
  additionalCharges: z.number().nonnegative().optional(),
  vatAmount: z.number().nonnegative().optional(),
  totalCostExclVat: z.number().nonnegative().optional(),
  totalCostInclVat: z.number().nonnegative().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  isWarrantyClaim: z.boolean().optional(),
  driverId: z.string().optional(),
  currency: z.string().min(1).optional(),
  kilometersAtService: z.number().int().positive().optional(),
  conditionBefore: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).optional(),
  conditionAfter: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']).optional(),
  technicianNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const transitionServiceSchema = z.object({
  action: z.enum(['SCHEDULE', 'AUTHORIZE', 'START', 'COMPLETE', 'APPROVE', 'RETURN']),
  notes: z.string().optional(),
});

export const bulkDeleteServiceRecordsSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one service record ID is required'),
});
