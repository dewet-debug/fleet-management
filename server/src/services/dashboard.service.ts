import prisma from '../config/database';

export async function getMetrics() {
  const [
    totalVehicles,
    activeVehicles,
    inServiceVehicles,
    totalDrivers,
    activeDrivers,
    activeAssignments,
    totalServiceRecords,
    pendingServices,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
    prisma.vehicle.count({ where: { status: 'IN_SERVICE' } }),
    prisma.driver.count(),
    prisma.driver.count({ where: { status: 'ACTIVE' } }),
    prisma.assignment.count({ where: { status: 'ACTIVE' } }),
    prisma.serviceRecord.count(),
    prisma.serviceRecord.count({
      where: {
        status: { in: ['DRAFT', 'SCHEDULED', 'AUTHORIZED'] },
      },
    }),
  ]);

  // Cost metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const allServiceCosts = await prisma.serviceRecord.findMany({
    where: { totalCostInclVat: { not: null } },
    select: { totalCostInclVat: true, createdAt: true },
  });

  const mtdCost = allServiceCosts
    .filter(r => new Date(r.createdAt) >= startOfMonth)
    .reduce((sum, r) => sum + (r.totalCostInclVat || 0), 0);

  const ytdCost = allServiceCosts
    .filter(r => new Date(r.createdAt) >= startOfYear)
    .reduce((sum, r) => sum + (r.totalCostInclVat || 0), 0);

  return {
    totalVehicles,
    activeVehicles,
    inServiceVehicles,
    totalDrivers,
    activeDrivers,
    activeAssignments,
    totalServiceRecords,
    pendingServices,
    serviceCostsMTD: mtdCost,
    serviceCostsYTD: ytdCost,
  };
}

export async function getRecentActivity(limit: number = 10) {
  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return logs;
}

export async function getAlerts() {
  const now = new Date();

  const serviceAlerts = await prisma.vehicleServiceInterval.findMany({
    where: {
      OR: [
        { nextServiceDate: { lt: now } },
        {
          vehicle: {
            currentKilometers: { gt: 0 },
          },
          nextServiceKilometers: { not: null },
        },
      ],
    },
    include: {
      vehicle: {
        select: {
          id: true,
          vin: true,
          licensePlate: true,
          make: true,
          model: true,
          year: true,
          currentKilometers: true,
        },
      },
    },
  });

  // Filter mileage-based alerts in application code
  const alerts = serviceAlerts.filter((interval) => {
    if (interval.nextServiceDate && interval.nextServiceDate < now) {
      return true;
    }
    if (
      interval.nextServiceKilometers &&
      interval.vehicle.currentKilometers >= interval.nextServiceKilometers
    ) {
      return true;
    }
    return false;
  });

  return alerts;
}
