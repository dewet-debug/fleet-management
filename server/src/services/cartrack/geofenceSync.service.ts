import prisma from '../../config/database';
import { CartrackApiClient } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncGeofences(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const geofences = (await client.getGeofences()) as any[];
  result.fetched = geofences.length;

  for (const g of geofences) {
    const cartrackGeofenceId = String((g as any).geofence_id ?? (g as any).id ?? (g as any).name);

    try {
      const existing = await prisma.cartrackGeofence.findUnique({
        where: { cartrackGeofenceId },
      });

      const geofenceData = {
        name: (g as any).name ?? null,
        type: (g as any).type ?? (g as any).shape ?? null,
        latitude: (g as any).latitude ?? (g as any).lat ?? (g as any).center_lat ?? null,
        longitude: (g as any).longitude ?? (g as any).lng ?? (g as any).center_lng ?? null,
        radius: (g as any).radius ?? null,
        rawJson: JSON.stringify(g),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackGeofence.update({
          where: { cartrackGeofenceId },
          data: geofenceData,
        });
        result.updated++;
      } else {
        await prisma.cartrackGeofence.create({
          data: { cartrackGeofenceId, ...geofenceData },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting geofence ${cartrackGeofenceId}:`, err);
      result.errored++;
    }
  }

  return result;
}

export async function syncGeofenceVisits(
  client: CartrackApiClient,
  sinceDate?: Date
): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  const visits = (await client.getGeofenceVisits({
    date_from: dateFrom.toISOString().split('T')[0],
    date_to: dateTo.toISOString().split('T')[0],
  })) as any[];

  result.fetched = visits.length;

  for (let idx = 0; idx < visits.length; idx++) {
    const v = visits[idx];

    const cartrackVisitId = String(
      (v as any).visit_id ??
        (v as any).id ??
        `${(v as any).geofence_id ?? 'g'}-${(v as any).vehicle_id ?? 'v'}-${(v as any).entry_time ?? (v as any).enter_time ?? idx}`
    );

    try {
      const existing = await prisma.cartrackGeofenceVisit.findUnique({
        where: { cartrackVisitId },
      });

      const entryRaw = (v as any).entry_time ?? (v as any).enter_time;
      const exitRaw = (v as any).exit_time ?? (v as any).leave_time;

      const visitData = {
        cartrackGeofenceId: (v as any).geofence_id != null ? String((v as any).geofence_id) : null,
        cartrackVehicleId: (v as any).vehicle_id != null ? String((v as any).vehicle_id) : null,
        geofenceName: (v as any).geofence_name ?? (v as any).name ?? null,
        entryTime: entryRaw ? new Date(entryRaw) : null,
        exitTime: exitRaw ? new Date(exitRaw) : null,
        durationMinutes: (v as any).duration_minutes ?? (v as any).duration ?? null,
        rawJson: JSON.stringify(v),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackGeofenceVisit.update({
          where: { cartrackVisitId },
          data: visitData,
        });
        result.updated++;
      } else {
        await prisma.cartrackGeofenceVisit.create({
          data: { cartrackVisitId, ...visitData },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting geofence visit ${cartrackVisitId}:`, err);
      result.errored++;
    }
  }

  return result;
}
