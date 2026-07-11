import prisma from '../../config/database';
import { CartrackApiClient, CartrackFuelResponse } from '../../lib/cartrack';

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

export async function syncFuel(client: CartrackApiClient, sinceDate?: Date): Promise<SyncResult> {
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

  // Fetch fleet-wide once (the per-vehicle filter is not honoured), then group by
  // vehicle_id. Fuel is a role-gated endpoint — if this account lacks the fuel
  // permission the API returns 403; treat that as "skip", not an error.
  let fuelRecords: CartrackFuelResponse[];
  try {
    fuelRecords = (await client.getFuel({
      start_timestamp: fmtTimestamp(dateFrom),
      end_timestamp: fmtTimestamp(dateTo),
    })) as CartrackFuelResponse[];
  } catch (err: any) {
    if (err?.response?.status === 403) {
      console.warn('[Cartrack] Fuel sync skipped — API credentials lack the fuel permission (403).');
      return result;
    }
    console.error('[Cartrack] Error fetching fuel:', err);
    result.errored++;
    return result;
  }

  for (const fuel of fuelRecords) {
    const fleetVehicleId = fleetByCartrackId.get(String(fuel.vehicle_id));
    if (!fleetVehicleId) continue;

    result.fetched++;
    const fuelId = fuel.fuel_id
      ? String(fuel.fuel_id)
      : `${fuel.vehicle_id}-${fuel.timestamp || ''}-${fuel.odometer || ''}`;

    try {
      const fuelData = {
        cartrackFleetVehicleId: fleetVehicleId,
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

      const existing = await prisma.cartrackFuelRecord.findUnique({
        where: { cartrackFuelId: fuelId },
      });

      if (existing) {
        await prisma.cartrackFuelRecord.update({ where: { cartrackFuelId: fuelId }, data: fuelData });
        result.updated++;
      } else {
        await prisma.cartrackFuelRecord.create({ data: { cartrackFuelId: fuelId, ...fuelData } });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting fuel record ${fuelId}:`, err);
      result.errored++;
    }
  }

  return result;
}
