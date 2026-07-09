import prisma from '../../config/database';
import { CartrackApiClient } from '../../lib/cartrack';
import { fmtTimestamp, skippableStatus } from './syncHelpers';

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

  const fleetByCartrackId = new Map<string, string>();
  for (const fv of fleetVehicles) {
    fleetByCartrackId.set(fv.cartrackVehicleId!, fv.id);
  }

  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  // Fleet-wide fetch (the per-vehicle filter is not honoured), grouped by vehicle.
  let events: any[];
  try {
    events = (await client.getCoachingEvents({
      start_timestamp: fmtTimestamp(dateFrom),
      end_timestamp: fmtTimestamp(dateTo),
    })) as any[];
  } catch (err) {
    const skip = skippableStatus(err);
    if (skip) {
      console.warn(`[Cartrack] Coaching sync skipped (${skip} — not permitted or outside allowed window).`);
      return result;
    }
    console.error('[Cartrack] Error fetching coaching events:', err);
    result.errored++;
    return result;
  }

  for (let idx = 0; idx < events.length; idx++) {
    const e = events[idx];
    const fleetVehicleId = fleetByCartrackId.get(String(e.vehicle_id));
    if (!fleetVehicleId) continue;

    result.fetched++;
    const eventId = String(
      e.event_id ?? e.id ?? e.coaching_event_id ?? `${fleetVehicleId}-${e.event_time ?? e.timestamp ?? idx}`
    );

    try {
      const rawEventTime = e.event_time ?? e.timestamp ?? null;
      const eventData = {
        cartrackFleetVehicleId: fleetVehicleId,
        driverName: e.driver_name ?? e.driver ?? null,
        eventType: e.event_type ?? e.type ?? null,
        score: e.score ?? null,
        latitude: e.latitude ?? e.lat ?? null,
        longitude: e.longitude ?? e.lng ?? null,
        eventTime: rawEventTime ? new Date(rawEventTime) : null,
        rawJson: JSON.stringify(e),
        fetchedAt: new Date(),
      };

      const existing = await prisma.cartrackCoachingEvent.findUnique({
        where: { cartrackEventId: eventId },
      });

      if (existing) {
        await prisma.cartrackCoachingEvent.update({ where: { cartrackEventId: eventId }, data: eventData });
        result.updated++;
      } else {
        await prisma.cartrackCoachingEvent.create({ data: { cartrackEventId: eventId, ...eventData } });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting coaching event ${eventId}:`, err);
      result.errored++;
    }
  }

  return result;
}
