import * as XLSX from 'xlsx';
import prisma from '../config/database';
import { createVehicle } from './vehicle.service';
import { createDriver } from './driver.service';
import { createServiceRecord } from './service.service';
import { createAssignment } from './assignment.service';
import { createVehicleSchema } from '../validators/vehicle.validator';
import { createDriverSchema } from '../validators/driver.validator';

// ---- Types ----

interface RowError {
  row: number;
  field?: string;
  message: string;
}

interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: RowError[];
}

// ---- Helpers ----

function parseExcelBuffer(buffer: Buffer): Record<string, any>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

function toStringOrUndefined(val: any): string | undefined {
  if (val === '' || val === null || val === undefined) return undefined;
  return String(val);
}

function toNumberOrUndefined(val: any): number | undefined {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

function toDateString(val: any): string | undefined {
  if (!val || val === '') return undefined;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
}

// ---- Vehicles ----

export async function bulkUploadVehicles(buffer: Buffer, userId: string): Promise<BulkUploadResult> {
  const rows = parseExcelBuffer(buffer);
  const result: BulkUploadResult = { total: rows.length, success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // Excel row (1-indexed + header)
    const r = rows[i];
    try {
      const data = {
        vin: String(r.vin || ''),
        licensePlate: String(r.licensePlate || ''),
        make: String(r.make || ''),
        model: String(r.model || ''),
        year: Number(r.year) || 0,
        color: String(r.color || ''),
        fuelType: String(r.fuelType || ''),
        currentKilometers: toNumberOrUndefined(r.currentKilometers),
        purchaseDate: toDateString(r.purchaseDate),
        purchasePrice: toNumberOrUndefined(r.purchasePrice),
        currency: toStringOrUndefined(r.currency),
        notes: toStringOrUndefined(r.notes),
        fleetNumber: toStringOrUndefined(r.fleetNumber),
        leaseCompany: toStringOrUndefined(r.leaseCompany),
        leaseAgreementNo: toStringOrUndefined(r.leaseAgreementNo),
        monthlyLeaseCost: toNumberOrUndefined(r.monthlyLeaseCost),
        currentBookValue: toNumberOrUndefined(r.currentBookValue),
        insuranceProvider: toStringOrUndefined(r.insuranceProvider),
        insurancePolicyNo: toStringOrUndefined(r.insurancePolicyNo),
        premiumAmount: toNumberOrUndefined(r.premiumAmount),
      };

      const validation = createVehicleSchema.safeParse(data);
      if (!validation.success) {
        const msg = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        result.errors.push({ row: rowNum, message: msg });
        result.failed++;
        continue;
      }

      await createVehicle(validation.data, userId);
      result.success++;
    } catch (err: any) {
      const msg = err.code === 'P2002'
        ? `Duplicate value: ${err.meta?.target?.join(', ') || 'unique constraint'}`
        : err.message || 'Unknown error';
      result.errors.push({ row: rowNum, message: msg });
      result.failed++;
    }
  }

  return result;
}

// ---- Drivers ----

export async function bulkUploadDrivers(buffer: Buffer, userId: string): Promise<BulkUploadResult> {
  const rows = parseExcelBuffer(buffer);
  const result: BulkUploadResult = { total: rows.length, success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const r = rows[i];
    try {
      const data = {
        employeeId: String(r.employeeId || ''),
        firstName: String(r.firstName || ''),
        lastName: String(r.lastName || ''),
        email: String(r.email || ''),
        phone: toStringOrUndefined(r.phone),
        licenseNumber: String(r.licenseNumber || ''),
        licenseExpiry: toDateString(r.licenseExpiry) || '',
        notes: toStringOrUndefined(r.notes),
      };

      const validation = createDriverSchema.safeParse(data);
      if (!validation.success) {
        const msg = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        result.errors.push({ row: rowNum, message: msg });
        result.failed++;
        continue;
      }

      await createDriver(validation.data, userId);
      result.success++;
    } catch (err: any) {
      const msg = err.code === 'P2002'
        ? `Duplicate value: ${err.meta?.target?.join(', ') || 'unique constraint'}`
        : err.message || 'Unknown error';
      result.errors.push({ row: rowNum, message: msg });
      result.failed++;
    }
  }

  return result;
}

// ---- Services ----

export async function bulkUploadServices(buffer: Buffer, userId: string): Promise<BulkUploadResult> {
  const rows = parseExcelBuffer(buffer);
  const result: BulkUploadResult = { total: rows.length, success: 0, failed: 0, errors: [] };

  // Pre-load lookup maps
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, licensePlate: true } });
  const vehicleMap = new Map(vehicles.map((v) => [v.licensePlate.toUpperCase(), v.id]));

  const serviceTypes = await prisma.serviceTypeConfig.findMany({ select: { id: true, name: true } });
  const serviceTypeMap = new Map(serviceTypes.map((s) => [s.name.toUpperCase(), s.id]));

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const r = rows[i];
    try {
      const plate = String(r.licensePlate || '').toUpperCase();
      const typeName = String(r.serviceType || '').toUpperCase();

      const vehicleId = vehicleMap.get(plate);
      if (!vehicleId) {
        result.errors.push({ row: rowNum, field: 'licensePlate', message: `Vehicle not found: ${r.licensePlate}` });
        result.failed++;
        continue;
      }

      const serviceTypeConfigId = serviceTypeMap.get(typeName);
      if (!serviceTypeConfigId) {
        result.errors.push({ row: rowNum, field: 'serviceType', message: `Service type not found: ${r.serviceType}` });
        result.failed++;
        continue;
      }

      const data: any = {
        vehicleId,
        serviceTypeConfigId,
        description: String(r.description || ''),
        scheduledDate: toDateString(r.scheduledDate),
        laborCost: toNumberOrUndefined(r.laborCost),
        partsCost: toNumberOrUndefined(r.partsCost),
        additionalCharges: toNumberOrUndefined(r.additionalCharges),
        vatAmount: toNumberOrUndefined(r.vatAmount),
        totalCostExclVat: toNumberOrUndefined(r.totalCostExclVat),
        totalCostInclVat: toNumberOrUndefined(r.totalCostInclVat),
        invoiceNumber: toStringOrUndefined(r.invoiceNumber),
        currency: toStringOrUndefined(r.currency),
      };

      if (!data.description) {
        result.errors.push({ row: rowNum, field: 'description', message: 'Description is required' });
        result.failed++;
        continue;
      }

      await createServiceRecord(data, userId);
      result.success++;
    } catch (err: any) {
      result.errors.push({ row: rowNum, message: err.message || 'Unknown error' });
      result.failed++;
    }
  }

  return result;
}

// ---- Assignments ----

export async function bulkUploadAssignments(buffer: Buffer, userId: string): Promise<BulkUploadResult> {
  const rows = parseExcelBuffer(buffer);
  const result: BulkUploadResult = { total: rows.length, success: 0, failed: 0, errors: [] };

  // Pre-load lookup maps
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, licensePlate: true } });
  const vehicleMap = new Map(vehicles.map((v) => [v.licensePlate.toUpperCase(), v.id]));

  const drivers = await prisma.driver.findMany({ select: { id: true, employeeId: true } });
  const driverMap = new Map(drivers.map((d) => [d.employeeId.toUpperCase(), d.id]));

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const r = rows[i];
    try {
      const plate = String(r.licensePlate || '').toUpperCase();
      const empId = String(r.employeeId || '').toUpperCase();

      const vehicleId = vehicleMap.get(plate);
      if (!vehicleId) {
        result.errors.push({ row: rowNum, field: 'licensePlate', message: `Vehicle not found: ${r.licensePlate}` });
        result.failed++;
        continue;
      }

      const driverId = driverMap.get(empId);
      if (!driverId) {
        result.errors.push({ row: rowNum, field: 'employeeId', message: `Driver not found: ${r.employeeId}` });
        result.failed++;
        continue;
      }

      const startDate = toDateString(r.startDate);
      if (!startDate) {
        result.errors.push({ row: rowNum, field: 'startDate', message: 'Start date is required' });
        result.failed++;
        continue;
      }

      await createAssignment(
        { vehicleId, driverId, startDate, notes: toStringOrUndefined(r.notes) },
        userId,
      );
      result.success++;
    } catch (err: any) {
      result.errors.push({ row: rowNum, message: err.message || 'Unknown error' });
      result.failed++;
    }
  }

  return result;
}

// ---- Template Generation ----

const templates: Record<string, { headers: string[]; example: Record<string, any> }> = {
  vehicles: {
    headers: [
      'vin', 'licensePlate', 'make', 'model', 'year', 'color', 'fuelType',
      'currentKilometers', 'purchaseDate', 'purchasePrice', 'currency', 'notes',
      'fleetNumber', 'leaseCompany', 'leaseAgreementNo', 'monthlyLeaseCost',
      'currentBookValue', 'insuranceProvider', 'insurancePolicyNo', 'premiumAmount',
    ],
    example: {
      vin: 'ABC123456789', licensePlate: 'CA 123-456', make: 'Toyota',
      model: 'Hilux', year: 2024, color: 'White', fuelType: 'Diesel',
      currentKilometers: 15000, purchaseDate: '2024-01-15', purchasePrice: 450000,
      currency: 'ZAR', notes: '', fleetNumber: 'FL001', leaseCompany: '',
      leaseAgreementNo: '', monthlyLeaseCost: '', currentBookValue: 400000,
      insuranceProvider: '', insurancePolicyNo: '', premiumAmount: '',
    },
  },
  drivers: {
    headers: ['employeeId', 'firstName', 'lastName', 'email', 'phone', 'licenseNumber', 'licenseExpiry', 'notes'],
    example: {
      employeeId: 'EMP001', firstName: 'John', lastName: 'Doe',
      email: 'john.doe@example.com', phone: '+27821234567',
      licenseNumber: 'DL12345678', licenseExpiry: '2026-12-31', notes: '',
    },
  },
  services: {
    headers: [
      'licensePlate', 'serviceType', 'description', 'scheduledDate',
      'laborCost', 'partsCost', 'vatAmount', 'totalCostExclVat',
      'totalCostInclVat', 'invoiceNumber', 'currency',
    ],
    example: {
      licensePlate: 'CA 123-456', serviceType: 'Oil Change',
      description: 'Regular oil change and filter replacement',
      scheduledDate: '2026-03-01', laborCost: 500, partsCost: 350,
      vatAmount: 127.5, totalCostExclVat: 850, totalCostInclVat: 977.5,
      invoiceNumber: 'INV-001', currency: 'ZAR',
    },
  },
  assignments: {
    headers: ['licensePlate', 'employeeId', 'startDate', 'notes'],
    example: {
      licensePlate: 'CA 123-456', employeeId: 'EMP001',
      startDate: '2026-02-01', notes: 'Primary vehicle assignment',
    },
  },
};

export function generateTemplate(type: string): Buffer {
  const tmpl = templates[type];
  if (!tmpl) throw new Error(`Unknown template type: ${type}`);

  const wb = XLSX.utils.book_new();
  const data = [tmpl.headers, tmpl.headers.map((h) => tmpl.example[h] ?? '')];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = tmpl.headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));

  XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
