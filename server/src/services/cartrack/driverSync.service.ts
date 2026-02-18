import prisma from '../../config/database';
import { CartrackApiClient, CartrackDriverResponse, CartrackDriverLinkageResponse } from '../../lib/cartrack';

interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  errored: number;
}

export async function syncDrivers(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const drivers = await client.getDrivers() as CartrackDriverResponse[];
  result.fetched = drivers.length;

  for (const driver of drivers) {
    const driverId = String(driver.driver_id);

    try {
      const existing = await prisma.cartrackDriver.findUnique({
        where: { cartrackDriverId: driverId },
      });

      const driverData = {
        firstName: driver.first_name ?? null,
        lastName: driver.last_name ?? null,
        employeeNumber: driver.employee_number ?? null,
        licenseNumber: driver.license_number ?? null,
        phone: driver.phone ?? null,
        email: driver.email ?? null,
        status: driver.status ?? null,
        rawJson: JSON.stringify(driver),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackDriver.update({
          where: { cartrackDriverId: driverId },
          data: driverData,
        });
        result.updated++;
      } else {
        await prisma.cartrackDriver.create({
          data: { cartrackDriverId: driverId, ...driverData },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting driver ${driverId}:`, err);
      result.errored++;
    }
  }

  return result;
}

export async function syncDriverLinkages(client: CartrackApiClient): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, created: 0, updated: 0, errored: 0 };

  const linkages = await client.getDriverLinkages() as CartrackDriverLinkageResponse[];
  result.fetched = linkages.length;

  for (const linkage of linkages) {
    const vehicleId = String(linkage.vehicle_id);
    const driverId = String(linkage.driver_id);

    try {
      // Ensure the driver exists in our table first
      const driverExists = await prisma.cartrackDriver.findUnique({
        where: { cartrackDriverId: driverId },
      });
      if (!driverExists) continue;

      const existing = await prisma.cartrackDriverLinkage.findUnique({
        where: { cartrackVehicleId_cartrackDriverId: { cartrackVehicleId: vehicleId, cartrackDriverId: driverId } },
      });

      const linkageData = {
        startDate: linkage.start_date ? new Date(linkage.start_date) : null,
        endDate: linkage.end_date ? new Date(linkage.end_date) : null,
        rawJson: JSON.stringify(linkage),
        fetchedAt: new Date(),
      };

      if (existing) {
        await prisma.cartrackDriverLinkage.update({
          where: { id: existing.id },
          data: linkageData,
        });
        result.updated++;
      } else {
        await prisma.cartrackDriverLinkage.create({
          data: {
            cartrackVehicleId: vehicleId,
            cartrackDriverId: driverId,
            ...linkageData,
          },
        });
        result.created++;
      }
    } catch (err) {
      console.error(`[Cartrack] Error upserting driver linkage ${vehicleId}-${driverId}:`, err);
      result.errored++;
    }
  }

  return result;
}
