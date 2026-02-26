import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { createAuditLog } from '../utils/audit';
import { parsePagination, paginatedResponse } from '../utils/pagination';

export async function listVehicles(params: {
  page: number; limit: number; status?: string; make?: string; search?: string;
}) {
  const { page, limit } = params;
  const { skip } = parsePagination({ page: String(page), limit: String(limit) });

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.make) where.make = { contains: params.make };
  if (params.search) {
    where.OR = [
      { vin: { contains: params.search } },
      { licensePlate: { contains: params.search } },
      { make: { contains: params.search } },
      { model: { contains: params.search } },
    ];
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { driver: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return paginatedResponse(vehicles, total, { page, limit, skip });
}

export async function getVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { driver: true },
        orderBy: { createdAt: 'desc' },
      },
      serviceRecords: {
        include: { serviceType: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  return vehicle;
}

export async function createVehicle(data: any, userId: string) {
  const vehicleData: any = { ...data, currentKilometers: data.currentKilometers ?? 0 };
  if (data.purchaseDate) vehicleData.purchaseDate = new Date(data.purchaseDate);
  if (data.leaseStartDate) vehicleData.leaseStartDate = new Date(data.leaseStartDate);
  if (data.leaseEndDate) vehicleData.leaseEndDate = new Date(data.leaseEndDate);
  if (data.policyStartDate) vehicleData.policyStartDate = new Date(data.policyStartDate);
  if (data.policyExpiryDate) vehicleData.policyExpiryDate = new Date(data.policyExpiryDate);
  if (data.registrationExpiry) vehicleData.registrationExpiry = new Date(data.registrationExpiry);
  if (data.warrantyExpiry) vehicleData.warrantyExpiry = new Date(data.warrantyExpiry);

  const vehicle = await prisma.vehicle.create({ data: vehicleData });
  await createAuditLog(prisma, userId, 'CREATE', 'Vehicle', vehicle.id);
  return vehicle;
}

export async function updateVehicle(id: string, data: any, userId: string) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Vehicle not found');
  if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
  if (data.leaseStartDate) data.leaseStartDate = new Date(data.leaseStartDate);
  if (data.leaseEndDate) data.leaseEndDate = new Date(data.leaseEndDate);
  if (data.policyStartDate) data.policyStartDate = new Date(data.policyStartDate);
  if (data.policyExpiryDate) data.policyExpiryDate = new Date(data.policyExpiryDate);
  if (data.registrationExpiry) data.registrationExpiry = new Date(data.registrationExpiry);
  if (data.warrantyExpiry) data.warrantyExpiry = new Date(data.warrantyExpiry);

  const vehicle = await prisma.vehicle.update({ where: { id }, data });
  await createAuditLog(prisma, userId, 'UPDATE', 'Vehicle', id);
  return vehicle;
}

export async function deleteVehicle(id: string, userId: string) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Vehicle not found');

  const activeAssignment = await prisma.assignment.findFirst({
    where: { vehicleId: id, status: 'ACTIVE' },
  });
  if (activeAssignment) throw new BadRequestError('Cannot delete vehicle with active assignment');

  await prisma.$transaction(async (tx) => {
    // Delete Cartrack data chain (deepest children first)
    const cartrackFleetVehicle = await tx.cartrackFleetVehicle.findUnique({ where: { vehicleId: id } });
    if (cartrackFleetVehicle) {
      await tx.cartrackVehicleData.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
      await tx.cartrackTrip.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
      await tx.cartrackAlert.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
      await tx.cartrackFuelRecord.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
      await tx.cartrackFleetVehicle.delete({ where: { vehicleId: id } });
    }

    // Delete service record children, then service records
    const serviceRecordIds = (await tx.serviceRecord.findMany({
      where: { vehicleId: id }, select: { id: true },
    })).map((r) => r.id);
    if (serviceRecordIds.length > 0) {
      await tx.serviceStatusHistory.deleteMany({ where: { serviceRecordId: { in: serviceRecordIds } } });
      await tx.photo.deleteMany({ where: { serviceRecordId: { in: serviceRecordIds } } });
    }
    await tx.serviceRecord.deleteMany({ where: { vehicleId: id } });

    // Delete vehicle service intervals
    await tx.vehicleServiceInterval.deleteMany({ where: { vehicleId: id } });

    // Delete all assignments (inactive/ended ones — active already blocked above)
    await tx.assignment.deleteMany({ where: { vehicleId: id } });

    // Finally delete the vehicle
    await tx.vehicle.delete({ where: { id } });
  });

  await createAuditLog(prisma, userId, 'DELETE', 'Vehicle', id);
}

export async function bulkDeleteVehicles(ids: string[], userId: string) {
  const deleted: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (const id of ids) {
    try {
      const existing = await prisma.vehicle.findUnique({ where: { id } });
      if (!existing) {
        failed.push({ id, reason: 'Vehicle not found' });
        continue;
      }

      const activeAssignment = await prisma.assignment.findFirst({
        where: { vehicleId: id, status: 'ACTIVE' },
      });
      if (activeAssignment) {
        failed.push({ id, reason: 'Cannot delete vehicle with active assignment' });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const cartrackFleetVehicle = await tx.cartrackFleetVehicle.findUnique({ where: { vehicleId: id } });
        if (cartrackFleetVehicle) {
          await tx.cartrackVehicleData.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
          await tx.cartrackTrip.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
          await tx.cartrackAlert.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
          await tx.cartrackFuelRecord.deleteMany({ where: { cartrackFleetVehicleId: cartrackFleetVehicle.id } });
          await tx.cartrackFleetVehicle.delete({ where: { vehicleId: id } });
        }

        const serviceRecordIds = (await tx.serviceRecord.findMany({
          where: { vehicleId: id }, select: { id: true },
        })).map((r) => r.id);
        if (serviceRecordIds.length > 0) {
          await tx.serviceStatusHistory.deleteMany({ where: { serviceRecordId: { in: serviceRecordIds } } });
          await tx.photo.deleteMany({ where: { serviceRecordId: { in: serviceRecordIds } } });
        }
        await tx.serviceRecord.deleteMany({ where: { vehicleId: id } });

        await tx.vehicleServiceInterval.deleteMany({ where: { vehicleId: id } });
        await tx.assignment.deleteMany({ where: { vehicleId: id } });
        await tx.vehicle.delete({ where: { id } });
      });

      await createAuditLog(prisma, userId, 'DELETE', 'Vehicle', id);
      deleted.push(id);
    } catch {
      failed.push({ id, reason: 'Unexpected error' });
    }
  }

  return { deleted, failed };
}

export async function updateKilometers(id: string, mileage: number, userId: string) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Vehicle not found');

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { currentKilometers: mileage },
  });
  await createAuditLog(prisma, userId, 'KILOMETERS_UPDATE', 'Vehicle', id, { from: existing.currentKilometers, to: mileage });
  return vehicle;
}

export async function getVehicleCosts(vehicleId: string) {
  const [records, vehicle] = await Promise.all([
    prisma.serviceRecord.findMany({
      where: { vehicleId },
      select: {
        totalCostInclVat: true,
        createdAt: true,
        serviceType: { select: { name: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { currentKilometers: true },
    }),
  ]);

  if (!vehicle) throw new NotFoundError('Vehicle not found');

  const lifetimeCost = records.reduce((sum, r) => sum + (r.totalCostInclVat || 0), 0);
  const lifetimeServices = records.length;
  const averageCostPerService = lifetimeServices > 0 ? lifetimeCost / lifetimeServices : 0;
  const currentKm = vehicle.currentKilometers || 0;
  const costPerKm = currentKm > 0 ? lifetimeCost / currentKm : 0;

  // Group by service type
  const serviceTypeMap: Record<string, { count: number; totalCost: number }> = {};
  for (const r of records) {
    const name = r.serviceType?.name || 'Unknown';
    if (!serviceTypeMap[name]) serviceTypeMap[name] = { count: 0, totalCost: 0 };
    serviceTypeMap[name].count++;
    serviceTypeMap[name].totalCost += r.totalCostInclVat || 0;
  }
  const costByServiceType = Object.entries(serviceTypeMap).map(([serviceType, data]) => ({
    serviceType,
    count: data.count,
    totalCost: data.totalCost,
  }));

  // Monthly breakdown
  const monthMap: Record<string, { label: string; serviceCount: number; totalCost: number }> = {};
  for (const r of records) {
    const date = new Date(r.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!monthMap[month]) monthMap[month] = { label, serviceCount: 0, totalCost: 0 };
    monthMap[month].serviceCount++;
    monthMap[month].totalCost += r.totalCostInclVat || 0;
  }
  const monthlyBreakdown = Object.entries(monthMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, data]) => ({ month, ...data }));

  // Group by driver
  const driverMap: Record<string, { driverName: string; serviceCount: number; totalCost: number }> = {};
  for (const r of records) {
    const driverId = r.driver?.id || 'unassigned';
    const driverName = r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : 'Unassigned';
    if (!driverMap[driverId]) driverMap[driverId] = { driverName, serviceCount: 0, totalCost: 0 };
    driverMap[driverId].serviceCount++;
    driverMap[driverId].totalCost += r.totalCostInclVat || 0;
  }
  const costByDriver = Object.entries(driverMap).map(([driverId, data]) => ({
    driverId,
    ...data,
  }));

  return {
    lifetimeCost,
    lifetimeServices,
    averageCostPerService,
    costPerKm,
    costByServiceType,
    monthlyBreakdown,
    costByDriver,
  };
}
