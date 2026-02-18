import prisma from '../../config/database';
import { CartrackApiClient, CartrackAlertNotificationResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncAlerts(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const fleetVehicles = await prisma.cartrackFleetVehicle.findMany({
    where: { isActive: true, cartrackVehicleId: { not: null } },
  });

  if (fleetVehicles.length === 0) return result;

  // Cartrack limits alert notifications to 31 days
  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  for (const fv of fleetVehicles) {
    try {
      const alerts = await client.getAlertNotifications({
        vehicle_id: parseInt(fv.cartrackVehicleId!, 10),
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
      }) as CartrackAlertNotificationResponse[];

      result.fetched += alerts.length;

      for (const alert of alerts) {
        const alertId = String(alert.alert_id);

        try {
          const existing = await prisma.cartrackAlert.findUnique({
            where: { cartrackAlertId: alertId },
          });

          const alertData = {
            cartrackFleetVehicleId: fv.id,
            alertType: alert.alert_type ?? null,
            severity: alert.severity ?? null,
            message: alert.message ?? null,
            latitude: alert.latitude ?? null,
            longitude: alert.longitude ?? null,
            eventTime: alert.event_time ? new Date(alert.event_time) : null,
            rawJson: JSON.stringify(alert),
            fetchedAt: new Date(),
          };

          if (existing) {
            await prisma.cartrackAlert.update({
              where: { cartrackAlertId: alertId },
              data: alertData,
            });
            result.updated++;
          } else {
            await prisma.cartrackAlert.create({
              data: { cartrackAlertId: alertId, ...alertData },
            });
            result.created++;
          }
        } catch (err) {
          console.error(`[Cartrack] Error upserting alert ${alertId}:`, err);
          result.errored++;
        }
      }
    } catch (err) {
      console.error(`[Cartrack] Error fetching alerts for vehicle ${fv.licensePlate}:`, err);
      result.errored++;
    }
  }

  return result;
}
