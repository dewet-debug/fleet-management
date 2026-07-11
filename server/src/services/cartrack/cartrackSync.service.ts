import prisma from '../../config/database';
import { CartrackApiClient } from '../../lib/cartrack';
import { decrypt } from '../../utils/encryption';
import { cartrackConfig } from '../../config/cartrack';
import { syncVehicles } from './vehicleSync.service';
import { syncTrips } from './tripSync.service';
import { syncDrivers, syncDriverLinkages } from './driverSync.service';
import { syncAlerts } from './alertSync.service';
import { syncFuel } from './fuelSync.service';
import { syncVehicleGroups } from './vehicleGroupSync.service';
import { syncCoaching } from './coachingSync.service';
import { syncVehicleEvents } from './vehicleEventSync.service';
import { syncGeofences, syncGeofenceVisits } from './geofenceSync.service';
import { syncReminders } from './reminderSync.service';
import { syncPois } from './poiSync.service';

let isSyncRunning = false;

export function getSyncRunningState(): boolean {
  return isSyncRunning;
}

async function getClient(): Promise<CartrackApiClient | null> {
  const config = await prisma.cartrackConfig.findFirst();
  if (!config) return null;

  let password = '';
  try {
    password = config.apiPasswordEncrypted
      ? decrypt(config.apiPasswordEncrypted, cartrackConfig.encryptionKey)
      : '';
  } catch {
    // Stored password can't be decrypted (e.g. the encryption key changed).
    // Credentials come only from the UI, so treat this as "not configured".
    password = '';
  }

  const username = config.apiUsername;
  if (!username || !password) return null;

  return new CartrackApiClient({
    baseUrl: config.apiBaseUrl || cartrackConfig.apiBaseUrl,
    username,
    password,
  });
}

export { getClient as getCartrackClient };

type SyncType =
  | 'FULL' | 'VEHICLES' | 'TRIPS' | 'DRIVERS' | 'DRIVER_LINKAGE' | 'ALERTS' | 'FUEL' | 'VEHICLE_GROUPS'
  | 'COACHING' | 'GEOFENCES' | 'GEOFENCE_VISITS' | 'VEHICLE_EVENTS' | 'REMINDERS' | 'POIS';

export async function runSync(
  syncType: SyncType,
  triggeredBy: 'SCHEDULER' | 'MANUAL',
  userId?: string,
  sinceDate?: Date,
): Promise<string> {
  if (isSyncRunning) {
    const log = await prisma.cartrackSyncLog.create({
      data: {
        syncType,
        status: 'CANCELLED',
        triggeredBy,
        triggeredByUserId: userId,
        errorMessage: 'Another sync is already in progress',
      },
    });
    return log.id;
  }

  // Check kill switch
  const config = await prisma.cartrackConfig.findFirst();
  if (!config || !config.isEnabled) {
    const log = await prisma.cartrackSyncLog.create({
      data: {
        syncType,
        status: 'CANCELLED',
        triggeredBy,
        triggeredByUserId: userId,
        errorMessage: 'Sync is disabled',
      },
    });
    return log.id;
  }

  const log = await prisma.cartrackSyncLog.create({
    data: {
      syncType,
      status: 'STARTED',
      triggeredBy,
      triggeredByUserId: userId,
    },
  });

  // Fire and forget — the sync runs in the background
  runSyncInternal(log.id, syncType, config, sinceDate).catch((err) => {
    console.error('[Cartrack] Unhandled sync error:', err);
  });

  return log.id;
}

async function runSyncInternal(
  logId: string,
  syncType: SyncType,
  config: any,
  sinceDate?: Date,
): Promise<void> {
  isSyncRunning = true;
  const startTime = Date.now();
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrored = 0;

  try {
    await prisma.cartrackSyncLog.update({
      where: { id: logId },
      data: { status: 'IN_PROGRESS' },
    });

    const client = await getClient();
    if (!client) {
      throw new Error('Failed to create Cartrack API client — check credentials');
    }

    const syncSteps: { type: string; enabled: boolean; fn: () => Promise<{ fetched: number; created: number; updated: number; errored: number }> }[] = [
      { type: 'VEHICLES', enabled: config.vehicleSyncEnabled, fn: () => syncVehicles(client) },
      { type: 'TRIPS', enabled: config.tripSyncEnabled, fn: () => syncTrips(client, sinceDate) },
      { type: 'DRIVERS', enabled: config.driverSyncEnabled, fn: () => syncDrivers(client) },
      { type: 'DRIVER_LINKAGE', enabled: config.driverSyncEnabled, fn: () => syncDriverLinkages(client) },
      { type: 'ALERTS', enabled: config.alertSyncEnabled, fn: () => syncAlerts(client, sinceDate) },
      { type: 'FUEL', enabled: config.fuelSyncEnabled, fn: () => syncFuel(client, sinceDate) },
      { type: 'VEHICLE_GROUPS', enabled: true, fn: () => syncVehicleGroups(client) },
      { type: 'COACHING', enabled: config.coachingSyncEnabled, fn: () => syncCoaching(client, sinceDate) },
      { type: 'GEOFENCES', enabled: config.geofenceSyncEnabled, fn: () => syncGeofences(client) },
      { type: 'GEOFENCE_VISITS', enabled: config.geofenceSyncEnabled, fn: () => syncGeofenceVisits(client, sinceDate) },
      { type: 'VEHICLE_EVENTS', enabled: config.vehicleEventSyncEnabled, fn: () => syncVehicleEvents(client, sinceDate) },
      { type: 'REMINDERS', enabled: config.reminderSyncEnabled, fn: () => syncReminders(client) },
      { type: 'POIS', enabled: config.poiSyncEnabled, fn: () => syncPois(client) },
    ];

    for (const step of syncSteps) {
      if (syncType !== 'FULL' && syncType !== step.type) continue;
      if (!step.enabled) continue;

      try {
        console.log(`[Cartrack] Starting ${step.type} sync...`);
        const result = await step.fn();
        totalFetched += result.fetched;
        totalCreated += result.created;
        totalUpdated += result.updated;
        totalErrored += result.errored;
        console.log(`[Cartrack] ${step.type} sync complete: fetched=${result.fetched}, created=${result.created}, updated=${result.updated}, errored=${result.errored}`);
      } catch (err) {
        console.error(`[Cartrack] ${step.type} sync failed:`, err);
        totalErrored++;
      }
    }

    await prisma.cartrackSyncLog.update({
      where: { id: logId },
      data: {
        status: totalErrored > 0 ? 'PARTIAL' : 'COMPLETED',
        completedAt: new Date(),
        recordsFetched: totalFetched,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        recordsErrored: totalErrored,
        durationMs: Date.now() - startTime,
      },
    });
  } catch (err) {
    await prisma.cartrackSyncLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        recordsFetched: totalFetched,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        recordsErrored: totalErrored,
        errorMessage: (err as Error).message,
        errorDetails: (err as Error).stack,
        durationMs: Date.now() - startTime,
      },
    });
  } finally {
    isSyncRunning = false;
  }
}
