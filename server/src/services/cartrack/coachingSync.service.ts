import prisma from '../../config/database';
import { CartrackApiClient } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncCoaching(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const fleetVehicles = await prisma.cartrackFleetVehicle.findMany({
    where: { isActive: true, cartrackVehicleId: { not: null } },
  });

  if (fleetVehicles.length === 0) return result;

  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  for (const fv of fleetVehicles) {
    try {
      const events = (await client.getCoachingEvents({
        vehicle_id: parseInt(fv.cartrackVehicleId!, 10),
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
      })) as any[];

      result.fetched += events.length;

      for (let idx = 0; idx < events.length; idx++) {
        const e = events[idx] as any;
        const eventId = String(
          e.event_id ?? e.id ?? e.coaching_event_id ?? `${fv.id}-${e.event_time ?? e.timestamp ?? idx}`
        );

        try {
          const existing = await prisma.cartrackCoachingEvent.findUnique({
            where: { cartrackEventId: eventId },
          });

          const rawEventTime = e.event_time ?? e.timestamp ?? null;

          const eventData = {
            cartrackFleetVehicleId: fv.id,
            driverName: e.driver_name ?? e.driver ?? null,
            eventType: e.event_type ?? e.type ?? null,
            score: e.score ?? null,
            latitude: e.latitude ?? e.lat ?? null,
            longitude: e.longitude ?? e.lng ?? null,
            eventTime: rawEventTime ? new Date(rawEventTime) : null,
            rawJson: JSON.stringify(e),
            fetchedAt: new Date(),
          };

          if (existing) {
            await prisma.cartrackCoachingEvent.update({
              where: { cartrackEventId: eventId },
              data: eventData,
            });
            result.updated++;
          } else {
            await prisma.cartrackCoachingEvent.create({
              data: { cartrackEventId: eventId, ...eventData },
            });
            result.created++;
          }
        } catch (err) {
          console.error(`[Cartrack] Error upserting coaching event ${eventId}:`, err);
          result.errored++;
        }
      }
    } catch (err) {
      console.error(`[Cartrack] Error fetching coaching events for vehicle ${fv.licensePlate}:`, err);
      result.errored++;
    }
  }

  return result;
}
