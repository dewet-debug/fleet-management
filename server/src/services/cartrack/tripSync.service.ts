import prisma from '../../config/database';
import { CartrackApiClient, CartrackTripResponse } from '../../lib/cartrack';

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

export async function syncTrips(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  // Map Cartrack vehicle_id -> our fleet vehicle row. The /trips endpoint ignores
  // the vehicle_id filter and returns the whole fleet, so we fetch once and group
  // by vehicle_id here instead of looping per vehicle (which would pull the entire
  // fleet's trips N times over).
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

  let trips: CartrackTripResponse[];
  try {
    trips = (await client.getTrips({
      start_timestamp: fmtTimestamp(dateFrom),
      end_timestamp: fmtTimestamp(dateTo),
    })) as CartrackTripResponse[];
  } catch (err) {
    console.error('[Cartrack] Error fetching trips:', err);
    result.errored++;
    return result;
  }

  for (const trip of trips) {
    // Only store trips for vehicles registered for sync.
    const fleetVehicleId = fleetByCartrackId.get(String(trip.vehicle_id));
    if (!fleetVehicleId) continue;

    result.fetched++;
    const tripId = String(trip.trip_id);

    try {
      const durationSeconds = trip.trip_duration_seconds ?? null;
      const distanceKm = trip.trip_distance != null ? trip.trip_distance / 1000 : null;
      const driverName = [trip.driver_name, trip.driver_surname].filter(Boolean).join(' ') || null;

      const tripData = {
        cartrackFleetVehicleId: fleetVehicleId,
        startTime: trip.start_timestamp ? new Date(trip.start_timestamp) : null,
        endTime: trip.end_timestamp ? new Date(trip.end_timestamp) : null,
        startLatitude: trip.start_coordinates?.latitude ?? null,
        startLongitude: trip.start_coordinates?.longitude ?? null,
        endLatitude: trip.end_coordinates?.latitude ?? null,
        endLongitude: trip.end_coordinates?.longitude ?? null,
        startAddress: trip.start_location ?? null,
        endAddress: trip.end_location ?? null,
        distanceKm,
        durationMinutes: durationSeconds != null ? durationSeconds / 60 : null,
        maxSpeed: trip.max_speed ?? null,
        // Not provided directly; derive from distance/duration when possible.
        averageSpeed:
          distanceKm != null && durationSeconds ? distanceKm / (durationSeconds / 3600) : null,
        idlingDurationMinutes: trip.idle_time_seconds != null ? trip.idle_time_seconds / 60 : null,
        fuelUsedLitres: null,
        driverName,
        rawJson: JSON.stringify(trip),
        fetchedAt: new Date(),
      };

      const existing = await prisma.cartrackTrip.findUnique({
        where: { cartrackTripId: tripId },
      });

      if (existing) {
        await prisma.cartrackTrip.update({ where: { cartrackTripId: tripId }, data: tripData });
        result.updated++;
      } else {
        await prisma.cartrackTrip.create({ data: { cartrackTripId: tripId, ...tripData } });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting trip ${tripId}:`, err);
      result.errored++;
    }
  }

  return result;
}
