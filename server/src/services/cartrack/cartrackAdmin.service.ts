import prisma from '../../config/database';
import { encrypt, decrypt } from '../../utils/encryption';
import { cartrackConfig } from '../../config/cartrack';
import { CartrackApiClient } from '../../lib/cartrack';
import { createAuditLog } from '../../utils/audit';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { parsePagination, paginatedResponse } from '../../utils/pagination';

// ---- Config ----

export async function getOrCreateConfig() {
  let config = await prisma.cartrackConfig.findFirst();
  if (!config) {
    config = await prisma.cartrackConfig.create({
      data: {
        apiBaseUrl: cartrackConfig.apiBaseUrl,
        apiUsername: cartrackConfig.apiUsername,
        apiPasswordEncrypted: cartrackConfig.apiPassword
          ? encrypt(cartrackConfig.apiPassword, cartrackConfig.encryptionKey)
          : '',
      },
    });
  }
  return {
    ...config,
    apiPasswordEncrypted: config.apiPasswordEncrypted ? '********' : '',
  };
}

export async function updateConfig(data: any, userId: string) {
  let config = await prisma.cartrackConfig.findFirst();
  if (!config) {
    config = await prisma.cartrackConfig.create({ data: {} as any });
  }

  const updateData: any = {};
  if (data.apiBaseUrl !== undefined) updateData.apiBaseUrl = data.apiBaseUrl;
  if (data.apiUsername !== undefined) updateData.apiUsername = data.apiUsername;
  if (data.apiPassword !== undefined) {
    updateData.apiPasswordEncrypted = encrypt(data.apiPassword, cartrackConfig.encryptionKey);
  }
  if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
  if (data.syncIntervalMinutes !== undefined) updateData.syncIntervalMinutes = data.syncIntervalMinutes;
  if (data.vehicleSyncEnabled !== undefined) updateData.vehicleSyncEnabled = data.vehicleSyncEnabled;
  if (data.tripSyncEnabled !== undefined) updateData.tripSyncEnabled = data.tripSyncEnabled;
  if (data.driverSyncEnabled !== undefined) updateData.driverSyncEnabled = data.driverSyncEnabled;
  if (data.alertSyncEnabled !== undefined) updateData.alertSyncEnabled = data.alertSyncEnabled;
  if (data.fuelSyncEnabled !== undefined) updateData.fuelSyncEnabled = data.fuelSyncEnabled;

  const updated = await prisma.cartrackConfig.update({
    where: { id: config.id },
    data: updateData,
  });

  await createAuditLog(prisma, userId, 'UPDATE', 'CartrackConfig', config.id);

  return {
    ...updated,
    apiPasswordEncrypted: updated.apiPasswordEncrypted ? '********' : '',
  };
}

export async function testConnection(): Promise<{ success: boolean; message: string; vehicleCount?: number }> {
  const config = await prisma.cartrackConfig.findFirst();
  if (!config) throw new BadRequestError('Cartrack config not found. Save credentials first.');

  let password = '';
  try {
    password = config.apiPasswordEncrypted
      ? decrypt(config.apiPasswordEncrypted, cartrackConfig.encryptionKey)
      : '';
  } catch {
    password = cartrackConfig.apiPassword;
  }

  const username = config.apiUsername || cartrackConfig.apiUsername;
  if (!username || !password) {
    throw new BadRequestError('API credentials not configured');
  }

  const client = new CartrackApiClient({
    baseUrl: config.apiBaseUrl || cartrackConfig.apiBaseUrl,
    username,
    password,
  });

  try {
    const response: any = await client.get('/vehicles', { limit: 1 });
    const total = response?.meta?.total ?? response?.data?.length ?? 0;
    return { success: true, message: 'Connection successful', vehicleCount: total };
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 401) return { success: false, message: 'Authentication failed — check username and password' };
    if (status === 403) return { success: false, message: 'Access forbidden — check API permissions' };
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

// ---- Fleet Vehicles ----

export async function listFleetVehicles(params: { page?: string; limit?: string; search?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const where: any = {};
  if (params.search) {
    where.licensePlate = { contains: params.search };
  }

  const [data, total] = await Promise.all([
    prisma.cartrackFleetVehicle.findMany({
      where,
      include: { vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } } },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cartrackFleetVehicle.count({ where }),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}

export async function addFleetVehicle(vehicleId: string, licensePlate: string, userId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new NotFoundError('Vehicle not found');

  const existing = await prisma.cartrackFleetVehicle.findFirst({
    where: { OR: [{ vehicleId }, { licensePlate }] },
  });
  if (existing) throw new BadRequestError('Vehicle is already registered for Cartrack sync');

  const fv = await prisma.cartrackFleetVehicle.create({
    data: { vehicleId, licensePlate: licensePlate.toUpperCase().replace(/\s/g, '') },
    include: { vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } } },
  });

  await createAuditLog(prisma, userId, 'CREATE', 'CartrackFleetVehicle', fv.id);
  return fv;
}

export async function bulkAddFleetVehicles(items: { vehicleId: string; licensePlate: string }[], userId: string) {
  const results: any[] = [];
  for (const item of items) {
    try {
      const fv = await addFleetVehicle(item.vehicleId, item.licensePlate, userId);
      results.push({ ...fv, status: 'added' });
    } catch (err: any) {
      results.push({ vehicleId: item.vehicleId, licensePlate: item.licensePlate, status: 'error', error: err.message });
    }
  }
  return results;
}

export async function removeFleetVehicle(id: string, userId: string) {
  const fv = await prisma.cartrackFleetVehicle.findUnique({ where: { id } });
  if (!fv) throw new NotFoundError('Fleet vehicle not found');

  await prisma.cartrackFleetVehicle.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog(prisma, userId, 'DELETE', 'CartrackFleetVehicle', id);
}

// ---- Sync Logs ----

export async function listSyncLogs(params: { page?: string; limit?: string; syncType?: string; status?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const where: any = {};
  if (params.syncType) where.syncType = params.syncType;
  if (params.status) where.status = params.status;

  const [data, total] = await Promise.all([
    prisma.cartrackSyncLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: 'desc' },
    }),
    prisma.cartrackSyncLog.count({ where }),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}

export async function getSyncLogById(id: string) {
  const log = await prisma.cartrackSyncLog.findUnique({ where: { id } });
  if (!log) throw new NotFoundError('Sync log not found');
  return log;
}

// ---- Vehicle Data Views ----

export async function getVehicleCartrackData(fleetVehicleId: string) {
  const data = await prisma.cartrackVehicleData.findUnique({
    where: { cartrackFleetVehicleId: fleetVehicleId },
  });
  if (!data) throw new NotFoundError('No Cartrack data found for this vehicle');
  return data;
}

export async function getVehicleTrips(fleetVehicleId: string, params: { page?: string; limit?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const [data, total] = await Promise.all([
    prisma.cartrackTrip.findMany({
      where: { cartrackFleetVehicleId: fleetVehicleId },
      skip,
      take: limit,
      orderBy: { startTime: 'desc' },
    }),
    prisma.cartrackTrip.count({ where: { cartrackFleetVehicleId: fleetVehicleId } }),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}

export async function getVehicleAlerts(fleetVehicleId: string, params: { page?: string; limit?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const [data, total] = await Promise.all([
    prisma.cartrackAlert.findMany({
      where: { cartrackFleetVehicleId: fleetVehicleId },
      skip,
      take: limit,
      orderBy: { eventTime: 'desc' },
    }),
    prisma.cartrackAlert.count({ where: { cartrackFleetVehicleId: fleetVehicleId } }),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}

export async function getVehicleFuel(fleetVehicleId: string, params: { page?: string; limit?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const [data, total] = await Promise.all([
    prisma.cartrackFuelRecord.findMany({
      where: { cartrackFleetVehicleId: fleetVehicleId },
      skip,
      take: limit,
      orderBy: { eventTime: 'desc' },
    }),
    prisma.cartrackFuelRecord.count({ where: { cartrackFleetVehicleId: fleetVehicleId } }),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}

export async function getCartrackDrivers(params: { page?: string; limit?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const [data, total] = await Promise.all([
    prisma.cartrackDriver.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.cartrackDriver.count(),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}

export async function getVehicleGroups(params: { page?: string; limit?: string }) {
  const { page, limit, skip } = parsePagination(params);

  const [data, total] = await Promise.all([
    prisma.cartrackVehicleGroup.findMany({ skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.cartrackVehicleGroup.count(),
  ]);

  return paginatedResponse(data, total, { page, limit, skip });
}
