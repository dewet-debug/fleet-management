import client from './client';

// ---- Types ----

export interface CartrackConfig {
  id: string;
  apiBaseUrl: string;
  apiUsername: string;
  apiPasswordEncrypted: string;
  isEnabled: boolean;
  syncIntervalMinutes: number;
  vehicleSyncEnabled: boolean;
  tripSyncEnabled: boolean;
  driverSyncEnabled: boolean;
  alertSyncEnabled: boolean;
  fuelSyncEnabled: boolean;
  lastHealthCheck: string | null;
}

export interface FleetVehicle {
  id: string;
  vehicleId: string;
  licensePlate: string;
  cartrackVehicleId: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  syncStatus: string;
  syncErrorMessage: string | null;
  vehicle: { id: string; make: string; model: string; year: number; licensePlate: string };
}

export interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  triggeredBy: string;
  triggeredByUserId: string | null;
  startedAt: string;
  completedAt: string | null;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsErrored: number;
  errorMessage: string | null;
  errorDetails: string | null;
  durationMs: number | null;
}

export interface SchedulerStatus {
  isRunning: boolean;
  isSyncing: boolean;
  intervalMinutes: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  vehicleCount?: number;
}

// ---- Config ----

export const getCartrackConfig = async (): Promise<CartrackConfig> => {
  const { data } = await client.get('/cartrack/config');
  return data.data;
};

export const updateCartrackConfig = async (configData: Record<string, any>): Promise<CartrackConfig> => {
  const { data } = await client.patch('/cartrack/config', configData);
  return data.data;
};

export const testCartrackConnection = async (): Promise<ConnectionTestResult> => {
  const { data } = await client.post('/cartrack/config/test-connection');
  return data.data;
};

// ---- Fleet Vehicles ----

export const getFleetVehicles = async (params?: { page?: number; limit?: number; search?: string }) => {
  const { data } = await client.get('/cartrack/fleet-vehicles', { params });
  return data;
};

export const addFleetVehicle = async (vehicleData: { vehicleId: string; licensePlate: string }): Promise<FleetVehicle> => {
  const { data } = await client.post('/cartrack/fleet-vehicles', vehicleData);
  return data.data;
};

export const bulkAddFleetVehicles = async (vehicles: { vehicleId: string; licensePlate: string }[]) => {
  const { data } = await client.post('/cartrack/fleet-vehicles/bulk', { vehicles });
  return data.data;
};

export const removeFleetVehicle = async (id: string): Promise<void> => {
  await client.delete(`/cartrack/fleet-vehicles/${id}`);
};

// ---- Sync ----

export const triggerSync = async (syncType: string): Promise<{ syncLogId: string }> => {
  const { data } = await client.post('/cartrack/sync', { syncType });
  return data.data;
};

export const getSchedulerStatus = async (): Promise<SchedulerStatus> => {
  const { data } = await client.get('/cartrack/sync/status');
  return data.data;
};

export const getSyncLogs = async (params?: { page?: number; limit?: number; syncType?: string; status?: string }) => {
  const { data } = await client.get('/cartrack/sync/logs', { params });
  return data;
};

export const getSyncLogById = async (id: string): Promise<SyncLog> => {
  const { data } = await client.get(`/cartrack/sync/logs/${id}`);
  return data.data;
};

// ---- Synced Data Views ----

export const getVehicleCartrackData = async (id: string) => {
  const { data } = await client.get(`/cartrack/vehicles/${id}/data`);
  return data.data;
};

export const getVehicleTrips = async (id: string, params?: { page?: number; limit?: number }) => {
  const { data } = await client.get(`/cartrack/vehicles/${id}/trips`, { params });
  return data;
};

export const getVehicleAlerts = async (id: string, params?: { page?: number; limit?: number }) => {
  const { data } = await client.get(`/cartrack/vehicles/${id}/alerts`, { params });
  return data;
};

export const getVehicleFuel = async (id: string, params?: { page?: number; limit?: number }) => {
  const { data } = await client.get(`/cartrack/vehicles/${id}/fuel`, { params });
  return data;
};

export const getCartrackDrivers = async (params?: { page?: number; limit?: number }) => {
  const { data } = await client.get('/cartrack/drivers', { params });
  return data;
};

export const getVehicleGroups = async (params?: { page?: number; limit?: number }) => {
  const { data } = await client.get('/cartrack/vehicle-groups', { params });
  return data;
};
