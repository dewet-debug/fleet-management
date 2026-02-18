import prisma from '../../config/database';
import { CartrackApiClient, CartrackVehicleResponse, CartrackVehicleStatusResponse, CartrackPaginatedResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncVehicles(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  // Get all active fleet vehicles we need to match
  const fleetVehicles = await prisma.cartrackFleetVehicle.findMany({
    where: { isActive: true },
    include: { vehicle: true },
  });

  if (fleetVehicles.length === 0) return result;

  // Fetch all vehicles from Cartrack
  const cartrackVehicles = await client.getVehicles() as CartrackVehicleResponse[];
  result.fetched = cartrackVehicles.length;

  // Build a lookup by registration (normalized: uppercase, no spaces)
  const cartrackByReg = new Map<string, CartrackVehicleResponse>();
  for (const cv of cartrackVehicles) {
    if (cv.registration) {
      cartrackByReg.set(cv.registration.toUpperCase().replace(/\s/g, ''), cv);
    }
  }

  // Fetch vehicle status for live telemetry
  let statusByVehicleId = new Map<number, CartrackVehicleStatusResponse>();
  try {
    const statusResponse = await client.getVehicleStatus() as CartrackPaginatedResponse<CartrackVehicleStatusResponse>;
    const statuses = Array.isArray(statusResponse) ? statusResponse : (statusResponse.data || []);
    for (const s of statuses) {
      statusByVehicleId.set(s.vehicle_id, s);
    }
  } catch (err) {
    console.warn('[Cartrack] Failed to fetch vehicle status, continuing without:', (err as Error).message);
  }

  // Match and sync each fleet vehicle
  for (const fv of fleetVehicles) {
    try {
      const normalizedPlate = fv.licensePlate.toUpperCase().replace(/\s/g, '');
      const cartrackVehicle = cartrackByReg.get(normalizedPlate);

      if (!cartrackVehicle) {
        await prisma.cartrackFleetVehicle.update({
          where: { id: fv.id },
          data: { syncStatus: 'NOT_FOUND', syncErrorMessage: 'No matching vehicle found in Cartrack' },
        });
        continue;
      }

      const cartrackVehicleId = String(cartrackVehicle.vehicle_id);
      const status = statusByVehicleId.get(cartrackVehicle.vehicle_id);

      // Update the fleet vehicle with the Cartrack ID
      await prisma.cartrackFleetVehicle.update({
        where: { id: fv.id },
        data: {
          cartrackVehicleId,
          syncStatus: 'SYNCED',
          syncErrorMessage: null,
          lastSyncedAt: new Date(),
        },
      });

      // Upsert vehicle data
      const vehicleData = {
        cartrackVehicleId,
        registrationNumber: cartrackVehicle.registration,
        make: cartrackVehicle.make || null,
        model: cartrackVehicle.model || null,
        year: cartrackVehicle.year ? String(cartrackVehicle.year) : null,
        odometer: cartrackVehicle.odometer ?? status?.odometer ?? null,
        lastLatitude: status?.latitude ?? null,
        lastLongitude: status?.longitude ?? null,
        lastSpeed: status?.speed ?? null,
        lastIgnitionStatus: status?.ignition ?? null,
        lastEventTime: status?.last_event_time ? new Date(status.last_event_time) : null,
        fuelLevel: status?.fuel_level ?? null,
        rawVehicleJson: JSON.stringify(cartrackVehicle),
        rawStatusJson: status ? JSON.stringify(status) : null,
        fetchedAt: new Date(),
      };

      const existing = await prisma.cartrackVehicleData.findUnique({
        where: { cartrackFleetVehicleId: fv.id },
      });

      if (existing) {
        await prisma.cartrackVehicleData.update({
          where: { cartrackFleetVehicleId: fv.id },
          data: vehicleData,
        });
        result.updated++;
      } else {
        await prisma.cartrackVehicleData.create({
          data: { cartrackFleetVehicleId: fv.id, ...vehicleData },
        });
        result.created++;
      }

      // Update our Vehicle's odometer if Cartrack reports higher
      const cartrackOdometer = vehicleData.odometer;
      if (cartrackOdometer && cartrackOdometer > (fv.vehicle.currentKilometers || 0)) {
        await prisma.vehicle.update({
          where: { id: fv.vehicleId },
          data: { currentKilometers: Math.round(cartrackOdometer) },
        });
      }
    } catch (err) {
      console.error(`[Cartrack] Error syncing vehicle ${fv.licensePlate}:`, err);
      await prisma.cartrackFleetVehicle.update({
        where: { id: fv.id },
        data: { syncStatus: 'ERROR', syncErrorMessage: (err as Error).message },
      }).catch(() => {});
      result.errored++;
    }
  }

  return result;
}
