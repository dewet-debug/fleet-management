import { z } from 'zod';

const VehicleStatus = z.enum(['ACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE', 'RETIRED']);

export const createVehicleSchema = z.object({
  vin: z.string().min(1, 'VIN is required'),
  licensePlate: z.string().min(1, 'License plate is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().int('Year must be an integer'),
  color: z.string().min(1, 'Color is required'),
  fuelType: z.string().min(1, 'Fuel type is required'),
  currentKilometers: z.number().int().nonnegative().optional().default(0),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  currency: z.string().min(1).optional(),
  notes: z.string().optional(),
  fleetNumber: z.string().optional(),
  leaseCompany: z.string().optional(),
  leaseAgreementNo: z.string().optional(),
  leaseStartDate: z.string().optional(),
  leaseEndDate: z.string().optional(),
  monthlyLeaseCost: z.number().optional(),
  currentBookValue: z.number().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNo: z.string().optional(),
  coverageType: z.string().optional(),
  policyStartDate: z.string().optional(),
  policyExpiryDate: z.string().optional(),
  premiumAmount: z.number().optional(),
  registrationExpiry: z.string().optional(),
  warrantyExpiry: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  vin: z.string().min(1).optional(),
  licensePlate: z.string().min(1).optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.number().int().optional(),
  color: z.string().min(1).optional(),
  fuelType: z.string().min(1).optional(),
  currentKilometers: z.number().int().nonnegative().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  currency: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: VehicleStatus.optional(),
  fleetNumber: z.string().optional(),
  leaseCompany: z.string().optional(),
  leaseAgreementNo: z.string().optional(),
  leaseStartDate: z.string().optional(),
  leaseEndDate: z.string().optional(),
  monthlyLeaseCost: z.number().optional(),
  currentBookValue: z.number().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNo: z.string().optional(),
  coverageType: z.string().optional(),
  policyStartDate: z.string().optional(),
  policyExpiryDate: z.string().optional(),
  premiumAmount: z.number().optional(),
  registrationExpiry: z.string().optional(),
  warrantyExpiry: z.string().optional(),
});

export const updateKilometersSchema = z.object({
  kilometers: z.number().int().positive('Kilometers must be a positive integer'),
});

export const bulkDeleteVehiclesSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one vehicle ID is required'),
});
