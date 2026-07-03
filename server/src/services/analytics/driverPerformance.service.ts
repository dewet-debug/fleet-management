import prisma from '../../config/database';

/**
 * Per-driver performance from Bolt order data (bolt_trips). Reconstructs the
 * metrics the Bolt addendum calls out: acceptance / completion / cancellation
 * rates, finished trips, revenue, and active days — grouped by the stable
 * driver_uuid. All from data we already hold; no Cartrack needed.
 */

const SAST = '+02:00';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DriverPerformance {
  driverUuid: string;
  driverName: string | null;
  offered: number;
  accepted: number;
  rejected: number;
  noResponse: number;
  cancelledAfterAccept: number;
  finished: number;
  grossRevenue: number;
  netEarnings: number;
  activeDays: number;
  acceptanceRate: number | null;  // accepted / offered
  completionRate: number | null;  // finished / accepted
  cancellationRate: number | null; // cancelledAfterAccept / accepted
  revenuePerActiveDay: number | null;
}

export async function getDriverPerformance(params: { dateFrom?: string; dateTo?: string }) {
  const now = new Date();
  const end = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999${SAST}`) : now;
  const start = params.dateFrom ? new Date(`${params.dateFrom}T00:00:00${SAST}`) : new Date(now.getTime() - 30 * DAY_MS);

  const rows = await prisma.$queryRaw<
    Array<{
      driverUuid: string;
      driverName: string | null;
      offered: number;
      accepted: number;
      rejected: number;
      noResponse: number;
      cancelledAfterAccept: number;
      finished: number;
      gross: number;
      net: number;
      activeDays: number;
    }>
  >`
    SELECT driverUuid,
           MAX(driverName) AS driverName,
           COUNT(*) AS offered,
           SUM(CASE WHEN orderAcceptedAt IS NOT NULL THEN 1 ELSE 0 END) AS accepted,
           SUM(CASE WHEN orderStatus = 'driver_rejected' THEN 1 ELSE 0 END) AS rejected,
           SUM(CASE WHEN orderStatus = 'driver_did_not_respond' THEN 1 ELSE 0 END) AS noResponse,
           SUM(CASE WHEN orderStatus = 'driver_cancelled_after_accept' THEN 1 ELSE 0 END) AS cancelledAfterAccept,
           SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS finished,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN netEarnings END), 0) AS net,
           COUNT(DISTINCT date(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS activeDays
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end} AND driverUuid IS NOT NULL
    GROUP BY driverUuid
    ORDER BY gross DESC
    LIMIT 500`;

  const n = (v: unknown) => Number(v ?? 0);
  const drivers: DriverPerformance[] = rows.map((r) => {
    const offered = n(r.offered);
    const accepted = n(r.accepted);
    const finished = n(r.finished);
    const cancelled = n(r.cancelledAfterAccept);
    const gross = n(r.gross);
    const activeDays = n(r.activeDays);
    return {
      driverUuid: r.driverUuid,
      driverName: r.driverName,
      offered,
      accepted,
      rejected: n(r.rejected),
      noResponse: n(r.noResponse),
      cancelledAfterAccept: cancelled,
      finished,
      grossRevenue: gross,
      netEarnings: n(r.net),
      activeDays,
      acceptanceRate: offered > 0 ? accepted / offered : null,
      completionRate: accepted > 0 ? finished / accepted : null,
      cancellationRate: accepted > 0 ? cancelled / accepted : null,
      revenuePerActiveDay: activeDays > 0 ? gross / activeDays : null,
    };
  });

  const sum = (fn: (d: DriverPerformance) => number) => drivers.reduce((a, d) => a + fn(d), 0);
  const totalOffered = sum((d) => d.offered);
  const totalAccepted = sum((d) => d.accepted);
  const totalFinished = sum((d) => d.finished);

  return {
    window: { from: start.toISOString(), to: end.toISOString() },
    totals: {
      drivers: drivers.length,
      offered: totalOffered,
      accepted: totalAccepted,
      finished: totalFinished,
      grossRevenue: sum((d) => d.grossRevenue),
      netEarnings: sum((d) => d.netEarnings),
      acceptanceRate: totalOffered > 0 ? totalAccepted / totalOffered : null,
      completionRate: totalAccepted > 0 ? totalFinished / totalAccepted : null,
    },
    drivers,
  };
}
