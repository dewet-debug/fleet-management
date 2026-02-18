import prisma from '../../config/database';
import { CartrackApiClient, CartrackTripResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncTrips(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const fleetVehicles = await prisma.cartrackFleetVehicle.findMany({
    where: { isActive: true, cartrackVehicleId: { not: null } },
  });

  if (fleetVehicles.length === 0) return result;

  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  for (const fv of fleetVehicles) {
    try {
      const trips = await client.getTrips({
        vehicle_id: parseInt(fv.cartrackVehicleId!, 10),
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
      }) as CartrackTripResponse[];

      result.fetched += trips.length;

      for (const trip of trips) {
        const tripId = String(trip.trip_id);

        try {
          const existing = await prisma.cartrackTrip.findUnique({
            where: { cartrackTripId: tripId },
          });

          const tripData = {
            cartrackFleetVehicleId: fv.id,
            startTime: trip.start_time ? new Date(trip.start_time) : null,
            endTime: trip.end_time ? new Date(trip.end_time) : null,
            startLatitude: trip.start_latitude ?? null,
            startLongitude: trip.start_longitude ?? null,
            endLatitude: trip.end_latitude ?? null,
            endLongitude: trip.end_longitude ?? null,
            startAddress: trip.start_address ?? null,
            endAddress: trip.end_address ?? null,
            distanceKm: trip.distance ?? null,
            durationMinutes: trip.duration ?? null,
            maxSpeed: trip.max_speed ?? null,
            averageSpeed: trip.average_speed ?? null,
            idlingDurationMinutes: trip.idle_duration ?? null,
            fuelUsedLitres: trip.fuel_used ?? null,
            driverName: trip.driver_name ?? null,
            rawJson: JSON.stringify(trip),
            fetchedAt: new Date(),
          };

          if (existing) {
            await prisma.cartrackTrip.update({
              where: { cartrackTripId: tripId },
              data: tripData,
            });
            result.updated++;
          } else {
            await prisma.cartrackTrip.create({
              data: { cartrackTripId: tripId, ...tripData },
            });
            result.created++;
          }
        } catch (err) {
          console.error(`[Cartrack] Error upserting trip ${tripId}:`, err);
          result.errored++;
        }
      }
    } catch (err) {
      console.error(`[Cartrack] Error fetching trips for vehicle ${fv.licensePlate}:`, err);
      result.errored++;
    }
  }

  return result;
}
