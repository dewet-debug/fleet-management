import prisma from '../../config/database';

/**
 * Per-vehicle profitability / combined operational analytics.
 *
 * Combines Bolt commercial data (revenue, trips, distance) with the vehicle
 * registry and internal running costs (service records + lease), and reserves
 * slots for Cartrack telematics (odometer, behaviour) that populate when that
 * data flows. Anything without data is returned as null so the UI can show it
 * as "awaiting data" rather than a misleading zero.
 */

const SAST = '+02:00';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface VehicleProfitability {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  status: string;
  // Bolt commercial (live)
  finishedTrips: number;
  grossRevenue: number;
  netEarnings: number;
  commission: number;
  distanceKm: number;
  activeDays: number;
  revenuePerKm: number | null;
  revenuePerActiveDay: number | null;
  utilisation: number | null; // active days / window days
  // Internal running costs (populate when captured)
  serviceCost: number | null;
  leaseCost: number | null;
  runningCost: number | null;
  netProfit: number | null; // netEarnings - runningCost (null until any cost exists)
  costPerKm: number | null;
  // Cartrack telematics (reserved — populate when Cartrack is connected)
  telematicsOdometerKm: number | null;
}

export async function getVehicleProfitability(params: { dateFrom?: string; dateTo?: string }) {
  const now = new Date();
  const end = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999${SAST}`) : now;
  const start = params.dateFrom
    ? new Date(`${params.dateFrom}T00:00:00${SAST}`)
    : new Date(now.getTime() - 30 * DAY_MS);
  const windowDays = Math.max(1, (end.getTime() - start.getTime()) / DAY_MS);

  const [vehicles, boltAgg, activeDaysRows, serviceAgg, cartrackData] = await Promise.all([
    prisma.vehicle.findMany({
      select: { id: true, licensePlate: true, make: true, model: true, status: true, monthlyLeaseCost: true },
    }),
    prisma.boltTrip.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { not: null }, orderStatus: 'finished', orderCreatedAt: { gte: start, lte: end } },
      _sum: { ridePrice: true, netEarnings: true, commission: true, rideDistanceMeters: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ vehicleId: string; activeDays: number }>>`
      SELECT vehicleId, COUNT(DISTINCT date(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS activeDays
      FROM BoltTrip
      WHERE vehicleId IS NOT NULL AND orderStatus = 'finished'
        AND orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      GROUP BY vehicleId`,
    prisma.serviceRecord.groupBy({
      by: ['vehicleId'],
      where: { totalCostInclVat: { not: null }, createdAt: { gte: start, lte: end } },
      _sum: { totalCostInclVat: true },
    }),
    prisma.cartrackVehicleData.findMany({
      where: { odometer: { not: null } },
      select: { odometer: true, cartrackFleetVehicle: { select: { vehicleId: true } } },
    }),
  ]);

  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const boltById = new Map(boltAgg.map((b) => [b.vehicleId as string, b]));
  const activeById = new Map(activeDaysRows.map((r) => [r.vehicleId, Number(r.activeDays)]));
  const serviceById = new Map(serviceAgg.map((s) => [s.vehicleId, s._sum.totalCostInclVat ?? 0]));
  const odoById = new Map<string, number>();
  for (const c of cartrackData) {
    const vid = c.cartrackFleetVehicle?.vehicleId;
    if (vid && c.odometer != null) odoById.set(vid, c.odometer);
  }

  const leaseProrate = windowDays / 30.44; // window fraction of an average month

  // Only vehicles with Bolt activity in the window (the meaningful set).
  const rows: VehicleProfitability[] = [];
  for (const b of boltAgg) {
    const vid = b.vehicleId as string;
    const v = vById.get(vid);
    if (!v) continue;

    const grossRevenue = b._sum.ridePrice ?? 0;
    const netEarnings = b._sum.netEarnings ?? 0;
    const commission = b._sum.commission ?? 0;
    const distanceKm = (b._sum.rideDistanceMeters ?? 0) / 1000;
    const activeDays = activeById.get(vid) ?? 0;

    const serviceCost = serviceById.has(vid) ? serviceById.get(vid)! : null;
    const leaseCost = v.monthlyLeaseCost != null ? v.monthlyLeaseCost * leaseProrate : null;
    const hasCost = serviceCost != null || leaseCost != null;
    const runningCost = hasCost ? (serviceCost ?? 0) + (leaseCost ?? 0) : null;
    const netProfit = runningCost != null ? netEarnings - runningCost : null;

    rows.push({
      vehicleId: vid,
      licensePlate: v.licensePlate,
      make: v.make,
      model: v.model,
      status: v.status,
      finishedTrips: b._count._all,
      grossRevenue,
      netEarnings,
      commission,
      distanceKm,
      activeDays,
      revenuePerKm: distanceKm > 0 ? grossRevenue / distanceKm : null,
      revenuePerActiveDay: activeDays > 0 ? grossRevenue / activeDays : null,
      utilisation: activeDays / windowDays,
      serviceCost,
      leaseCost,
      runningCost,
      netProfit,
      costPerKm: runningCost != null && distanceKm > 0 ? runningCost / distanceKm : null,
      telematicsOdometerKm: odoById.get(vid) ?? null,
    });
  }

  rows.sort((a, b) => b.grossRevenue - a.grossRevenue);

  const sum = (fn: (r: VehicleProfitability) => number) => rows.reduce((a, r) => a + fn(r), 0);
  const totalGross = sum((r) => r.grossRevenue);
  const totalDistance = sum((r) => r.distanceKm);
  const anyCost = rows.some((r) => r.runningCost != null);

  return {
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    dataCoverage: {
      bolt: rows.length > 0,
      internalCosts: anyCost,
      cartrackTelematics: rows.some((r) => r.telematicsOdometerKm != null),
    },
    totals: {
      vehicles: rows.length,
      grossRevenue: totalGross,
      netEarnings: sum((r) => r.netEarnings),
      commission: sum((r) => r.commission),
      distanceKm: totalDistance,
      runningCost: anyCost ? sum((r) => r.runningCost ?? 0) : null,
      netProfit: anyCost ? sum((r) => r.netProfit ?? r.netEarnings) : null,
      revenuePerKm: totalDistance > 0 ? totalGross / totalDistance : null,
    },
    vehicles: rows,
  };
}
