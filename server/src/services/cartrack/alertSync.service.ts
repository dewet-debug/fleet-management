import prisma from '../../config/database';
import { CartrackApiClient, CartrackAlertNotificationResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

// Cartrack expects "Y-m-d H:i:s".
function fmtTimestamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function syncAlerts(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  // Like /trips, /alerts/notifications returns fleet-wide data, so fetch once and
  // group by vehicle_id rather than looping per vehicle.
  const fleetVehicles = await prisma.cartrackFleetVehicle.findMany({
    where: { isActive: true, cartrackVehicleId: { not: null } },
  });
  if (fleetVehicles.length === 0) return result;

  const fleetByCartrackId = new Map<string, string>();
  for (const fv of fleetVehicles) {
    fleetByCartrackId.set(fv.cartrackVehicleId!, fv.id);
  }

  // Cartrack limits alert notifications to 31 days; default to the last 24h.
  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  let alerts: CartrackAlertNotificationResponse[];
  try {
    alerts = (await client.getAlertNotifications({
      'filter[date_from]': fmtTimestamp(dateFrom),
      'filter[date_to]': fmtTimestamp(dateTo),
    })) as CartrackAlertNotificationResponse[];
  } catch (err) {
    console.error('[Cartrack] Error fetching alerts:', err);
    result.errored++;
    return result;
  }

  for (const alert of alerts) {
    const fleetVehicleId = fleetByCartrackId.get(String(alert.vehicle_id));
    if (!fleetVehicleId) continue;

    result.fetched++;
    const alertId = String(alert.alert_id);
    const eventTimeRaw = alert.event_time ?? (alert as any).event_ts ?? null;

    try {
      const alertData = {
        cartrackFleetVehicleId: fleetVehicleId,
        alertType: alert.alert_type ?? null,
        severity: alert.severity ?? null,
        message: alert.message ?? null,
        latitude: alert.latitude ?? null,
        longitude: alert.longitude ?? null,
        eventTime: eventTimeRaw ? new Date(eventTimeRaw) : null,
        rawJson: JSON.stringify(alert),
        fetchedAt: new Date(),
      };

      const existing = await prisma.cartrackAlert.findUnique({
        where: { cartrackAlertId: alertId },
      });

      if (existing) {
        await prisma.cartrackAlert.update({ where: { cartrackAlertId: alertId }, data: alertData });
        result.updated++;
      } else {
        await prisma.cartrackAlert.create({ data: { cartrackAlertId: alertId, ...alertData } });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting alert ${alertId}:`, err);
      result.errored++;
    }
  }

  return result;
}
