import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

export interface ListBoltTripsParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  matched?: 'matched' | 'unmatched';
  dateFrom?: string; // YYYY-MM-DD (SAST-ish; treated as local day boundaries)
  dateTo?: string;
}

function buildTripWhere(params: Omit<ListBoltTripsParams, 'page' | 'limit'>): Prisma.BoltTripWhereInput {
  const where: Prisma.BoltTripWhereInput = {};

  if (params.status) where.orderStatus = params.status;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
  if (params.matched === 'matched') where.vehicleId = { not: null };
  if (params.matched === 'unmatched') where.vehicleId = null;

  if (params.search) {
    where.OR = [
      { vehicleLicensePlate: { contains: params.search } },
      { driverName: { contains: params.search } },
      { orderReference: { contains: params.search } },
      { pickupAddress: { contains: params.search } },
      { destinationAddress: { contains: params.search } },
    ];
  }

  if (params.dateFrom || params.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    // Anchor date filters to SAST (UTC+2) day boundaries regardless of server
    // timezone, matching how the analytics endpoint buckets days.
    if (params.dateFrom) createdAt.gte = new Date(`${params.dateFrom}T00:00:00+02:00`);
    if (params.dateTo) createdAt.lte = new Date(`${params.dateTo}T23:59:59.999+02:00`);
    where.orderCreatedAt = createdAt;
  }

  return where;
}

export async function listBoltTrips(params: ListBoltTripsParams) {
  const { page, limit } = params;
  const skip = (page - 1) * limit;
  const where = buildTripWhere(params);

  const [trips, total] = await Promise.all([
    prisma.boltTrip.findMany({
      where,
      skip,
      take: limit,
      orderBy: { orderCreatedAt: 'desc' },
    }),
    prisma.boltTrip.count({ where }),
  ]);

  return {
    data: trips,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getBoltTripsSummary(params: {
  search?: string;
  status?: string;
  paymentMethod?: string;
  matched?: 'matched' | 'unmatched';
  dateFrom?: string;
  dateTo?: string;
}) {
  const where = buildTripWhere(params);
  const finishedWhere: Prisma.BoltTripWhereInput = { ...where, orderStatus: 'finished' };

  const [total, byStatus, finished, matchedCount, unmatchedCount] = await Promise.all([
    prisma.boltTrip.count({ where }),
    prisma.boltTrip.groupBy({ by: ['orderStatus'], where, _count: { _all: true } }),
    prisma.boltTrip.aggregate({
      where: finishedWhere,
      _count: { _all: true },
      _sum: {
        ridePrice: true,
        netEarnings: true,
        commission: true,
        bookingFee: true,
        tip: true,
        cashDiscount: true,
        tollFee: true,
        rideDistanceMeters: true,
      },
    }),
    prisma.boltTrip.count({ where: { ...where, vehicleId: { not: null } } }),
    prisma.boltTrip.count({ where: { ...where, vehicleId: null } }),
  ]);

  const s = finished._sum;
  return {
    totalOrders: total,
    finishedTrips: finished._count._all,
    byStatus: byStatus
      .map((r) => ({ status: r.orderStatus, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    revenue: {
      grossFare: s.ridePrice ?? 0,
      netEarnings: s.netEarnings ?? 0,
      commission: s.commission ?? 0,
      bookingFees: s.bookingFee ?? 0,
      tips: s.tip ?? 0,
      cashDiscounts: s.cashDiscount ?? 0,
      tollFees: s.tollFee ?? 0,
    },
    totalDistanceKm: (s.rideDistanceMeters ?? 0) / 1000,
    matchedToVehicle: matchedCount,
    unmatchedToVehicle: unmatchedCount,
  };
}

const SAST_OFFSET_SEC = 2 * 60 * 60;

/**
 * Analytics for the Bolt Trips "Analytics" tab: daily revenue trend, payment
 * mix, the completion funnel (attempts -> accepted -> finished -> net paid),
 * and top-earning vehicles. Defaults to the last 14 SAST days when no window
 * is given. Prisma stores SQLite DateTime as epoch-ms, so day bucketing shifts
 * by +2h and divides by 1000 for `unixepoch`.
 */
export async function getBoltTripsAnalytics(params: { dateFrom?: string; dateTo?: string }) {
  const now = new Date();
  // Date bounds anchored to SAST (UTC+2) so they align with the +7200s day
  // bucketing below regardless of the server's own timezone.
  const end = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999+02:00`) : now;
  const start = params.dateFrom
    ? new Date(`${params.dateFrom}T00:00:00+02:00`)
    : new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

  const dailyTrend = await prisma.$queryRaw<
    Array<{ day: string; attempts: number; finished: number; gross: number; net: number; commission: number; fees: number }>
  >`
    SELECT date(orderCreatedAt / 1000 + ${SAST_OFFSET_SEC}, 'unixepoch') AS day,
           COUNT(*) AS attempts,
           SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS finished,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN netEarnings END), 0) AS net,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN commission END), 0) AS commission,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN bookingFee END), 0) AS fees
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
    GROUP BY day ORDER BY day`;

  const paymentMix = await prisma.$queryRaw<Array<{ method: string; count: number; gross: number }>>`
    SELECT COALESCE(paymentMethod, 'unknown') AS method,
           COUNT(*) AS count,
           COALESCE(SUM(ridePrice), 0) AS gross
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end} AND orderStatus = 'finished'
    GROUP BY method ORDER BY count DESC`;

  const funnelRows = await prisma.$queryRaw<Array<{ attempts: number; accepted: number; finished: number; netPaid: number }>>`
    SELECT COUNT(*) AS attempts,
           SUM(CASE WHEN orderAcceptedAt IS NOT NULL THEN 1 ELSE 0 END) AS accepted,
           SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS finished,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN netEarnings END), 0) AS netPaid
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}`;

  const topVehicles = await prisma.$queryRaw<Array<{ plate: string; model: string | null; trips: number; gross: number }>>`
    SELECT vehicleLicensePlate AS plate, MAX(vehicleModel) AS model,
           COUNT(*) AS trips, COALESCE(SUM(ridePrice), 0) AS gross
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      AND orderStatus = 'finished' AND vehicleLicensePlate IS NOT NULL
    GROUP BY vehicleLicensePlate ORDER BY gross DESC LIMIT 8`;

  // Pickup demand aggregated into ~1km cells (lat/lng rounded to 2dp) for the map.
  const pickupZones = await prisma.$queryRaw<
    Array<{ lat: number; lng: number; count: number; sampleAddress: string | null }>
  >`
    SELECT ROUND(pickupLat, 2) AS lat, ROUND(pickupLng, 2) AS lng,
           COUNT(*) AS count, MAX(pickupAddress) AS sampleAddress
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      AND pickupLat IS NOT NULL AND pickupLng IS NOT NULL
    GROUP BY lat, lng ORDER BY count DESC LIMIT 300`;

  const num = (v: unknown) => Number(v ?? 0);
  const f = funnelRows[0] ?? { attempts: 0, accepted: 0, finished: 0, netPaid: 0 };

  return {
    window: { from: start.toISOString(), to: end.toISOString() },
    dailyTrend: dailyTrend.map((d) => ({
      day: d.day,
      attempts: num(d.attempts),
      finished: num(d.finished),
      gross: num(d.gross),
      net: num(d.net),
      commission: num(d.commission),
      fees: num(d.fees),
    })),
    paymentMix: paymentMix.map((p) => ({ method: p.method, count: num(p.count), gross: num(p.gross) })),
    funnel: {
      attempts: num(f.attempts),
      accepted: num(f.accepted),
      finished: num(f.finished),
      netPaid: num(f.netPaid),
    },
    topVehicles: topVehicles.map((t) => ({ plate: t.plate, model: t.model, trips: num(t.trips), gross: num(t.gross) })),
    pickupZones: pickupZones.map((z) => ({
      lat: Number(z.lat),
      lng: Number(z.lng),
      count: num(z.count),
      sampleAddress: z.sampleAddress,
    })),
  };
}

export async function listBoltSyncLogs(params: { page: number; limit: number; status?: string }) {
  const { page, limit } = params;
  const skip = (page - 1) * limit;
  const where: Prisma.BoltSyncLogWhereInput = {};
  if (params.status) where.status = params.status;

  const [logs, total] = await Promise.all([
    prisma.boltSyncLog.findMany({ where, skip, take: limit, orderBy: { startedAt: 'desc' } }),
    prisma.boltSyncLog.count({ where }),
  ]);

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
