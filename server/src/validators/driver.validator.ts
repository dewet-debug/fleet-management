import { z } from 'zod';

const DriverStatus = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

export const createDriverSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseExpiry: z.string().min(1, 'License expiry date is required'),
  notes: z.string().optional(),
});

export const updateDriverSchema = z.object({
  employeeId: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().min(1).optional(),
  licenseExpiry: z.string().optional(),
  notes: z.string().optional(),
  status: DriverStatus.optional(),
});

export const bulkDeleteDriversSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one driver ID is required'),
});
