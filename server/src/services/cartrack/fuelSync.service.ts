import prisma from '../../config/database';
import { CartrackApiClient, CartrackFuelResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncFuel(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const fleetVehicles = await prisma.cartrackFleetVehicle.findMany({
    where: { isActive: true, cartrackVehicleId: { not: null } },
  });

  if (fleetVehicles.length === 0) return result;

  const dateFrom = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  for (const fv of fleetVehicles) {
    try {
      const fuelRecords = await client.getFuel({
        vehicle_id: parseInt(fv.cartrackVehicleId!, 10),
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
      }) as CartrackFuelResponse[];

      result.fetched += fuelRecords.length;

      for (const fuel of fuelRecords) {
        // Generate a unique ID from available fields
        const fuelId = fuel.fuel_id
          ? String(fuel.fuel_id)
          : `${fv.cartrackVehicleId}-${fuel.timestamp || ''}-${fuel.odometer || ''}`;

        try {
          const existing = await prisma.cartrackFuelRecord.findUnique({
            where: { cartrackFuelId: fuelId },
          });

          const fuelData = {
            cartrackFleetVehicleId: fv.id,
            eventTime: fuel.timestamp ? new Date(fuel.timestamp) : null,
            litres: fuel.fuel_level ?? fuel.total_consumed ?? null,
            costPerLitre: fuel.cost_per_litre ?? null,
            totalCost: fuel.total_cost ?? null,
            odometer: fuel.odometer ?? null,
            location: fuel.location ?? null,
            fuelType: fuel.fuel_type ?? null,
            rawJson: JSON.stringify(fuel),
            fetchedAt: new Date(),
          };

          if (existing) {
            await prisma.cartrackFuelRecord.update({
              where: { cartrackFuelId: fuelId },
              data: fuelData,
            });
            result.updated++;
          } else {
            await prisma.cartrackFuelRecord.create({
              data: { cartrackFuelId: fuelId, ...fuelData },
            });
            result.created++;
          }
        } catch (err) {
          console.error(`[Cartrack] Error upserting fuel record ${fuelId}:`, err);
          result.errored++;
        }
      }
    } catch (err) {
      console.error(`[Cartrack] Error fetching fuel for vehicle ${fv.licensePlate}:`, err);
      result.errored++;
    }
  }

  return result;
}
