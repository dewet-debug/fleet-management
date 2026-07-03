/**
 * Day-chunked Bolt trip backfill over a date range, then a full-range summary.
 *
 *   npx tsx src/lib/bolt/runBackfill.ts <startYMD> <endYMD>
 *   e.g. npx tsx src/lib/bolt/runBackfill.ts 2026-06-01 2026-06-30
 *
 * Dates are inclusive CALENDAR days in SAST (UTC+2, Johannesburg). The API
 * rejects long ranges (INVALID_DATE_RANGE), so each day is fetched separately
 * and upserted into bolt_trips. Per-day API failures are logged and skipped,
 * not fatal.
 */

import prisma from '../../config/database';
import { env } from '../../config/env';
import { BoltTokenClient, httpTokenTransport } from './boltAuth';
import { BoltApiClient } from './boltApiClient';
import { syncBoltTripsWindow } from '../../services/bolt/tripSync.service';

const SAST_OFFSET_SEC = 2 * 60 * 60; // UTC+2, no DST

function money(n: number | null | undefined): string {
  return `R ${(n ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Unix seconds for YYYY-MM-DD at 00:00:00 SAST. */
function sastDayStartSec(ymd: string): number {
  return Math.floor(Date.parse(`${ymd}T00:00:00+02:00`) / 1000);
}

function addDaysYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const startYMD = process.argv[2];
  const endYMD = process.argv[3];
  if (!startYMD || !endYMD) {
    console.error('Usage: runBackfill.ts <startYMD> <endYMD>  (e.g. 2026-06-01 2026-06-30)');
    process.exitCode = 1;
    return;
  }
  if (!env.BOLT_CLIENT_ID || !env.BOLT_CLIENT_SECRET) {
    console.error('BOLT_CLIENT_ID / BOLT_CLIENT_SECRET not set in server/.env.');
    process.exitCode = 1;
    return;
  }

  const tokenClient = new BoltTokenClient({
    clientId: env.BOLT_CLIENT_ID,
    clientSecret: env.BOLT_CLIENT_SECRET,
    tokenUrl: env.BOLT_OIDC_TOKEN_URL,
    scope: env.BOLT_OAUTH_SCOPE,
    transport: httpTokenTransport,
  });
  const api = new BoltApiClient({ tokenClient });
  const companyIds = await api.getCompanies();
  console.log(`Company IDs: ${JSON.stringify(companyIds)}`);
  console.log(`Backfilling ${startYMD} .. ${endYMD} (SAST calendar days)\n`);

  const totals = { days: 0, fetched: 0, created: 0, updated: 0, matched: 0, errored: 0 };
  const failedDays: Array<{ day: string; error: string }> = [];

  for (let day = startYMD; day <= endYMD; day = addDaysYMD(day, 1)) {
    const startTs = sastDayStartSec(day);
    const endTs = sastDayStartSec(addDaysYMD(day, 1)); // exclusive next-day 00:00 SAST
    try {
      const r = await syncBoltTripsWindow(prisma, api, {
        companyIds,
        startTs,
        endTs,
        triggeredBy: 'runBackfill',
        pageLimit: 1000,
      });
      totals.days++;
      totals.fetched += r.fetched;
      totals.created += r.created;
      totals.updated += r.updated;
      totals.matched += r.matchedToVehicle;
      totals.errored += r.errored;
      console.log(
        `${day}: fetched=${r.fetched} created=${r.created} updated=${r.updated} matched=${r.matchedToVehicle} errored=${r.errored} (${(r.durationMs / 1000).toFixed(1)}s)`,
      );
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : err?.message ?? String(err);
      failedDays.push({ day, error: msg });
      console.error(`${day}: FAILED - ${msg}`);
    }
  }
  tokenClient.stop();

  console.log('\n=== Backfill totals ===');
  console.log(JSON.stringify(totals, null, 2));
  if (failedDays.length) {
    console.log('\nFailed days:');
    for (const f of failedDays) console.log(`  ${f.day}: ${f.error}`);
  }

  // --- full-range summary from the DB (SAST) ---
  const rangeStart = new Date(sastDayStartSec(startYMD) * 1000);
  const rangeEnd = new Date(sastDayStartSec(addDaysYMD(endYMD, 1)) * 1000);
  const inRange = { orderCreatedAt: { gte: rangeStart, lt: rangeEnd } };

  const byStatus = await prisma.boltTrip.groupBy({
    by: ['orderStatus'],
    where: inRange,
    _count: { _all: true },
  });
  console.log('\n=== Orders by status (range) ===');
  for (const r of byStatus.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${r.orderStatus.padEnd(28)} ${r._count._all}`);
  }

  const fin = await prisma.boltTrip.aggregate({
    where: { ...inRange, orderStatus: 'finished' },
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
  });
  const s = fin._sum;
  console.log('\n=== Finished trips - revenue bases (range) ===');
  console.log(`  finished trips:          ${fin._count._all}`);
  console.log(`  gross fare (ridePrice):  ${money(s.ridePrice)}`);
  console.log(`  net earnings:            ${money(s.netEarnings)}`);
  console.log(`  commission (Bolt):       ${money(s.commission)}`);
  console.log(`  booking fees:            ${money(s.bookingFee)}`);
  console.log(`  tips:                    ${money(s.tip)}`);
  console.log(`  cash discounts:          ${money(s.cashDiscount)}`);
  console.log(`  toll fees:               ${money(s.tollFee)}`);
  console.log(`  total distance:          ${((s.rideDistanceMeters ?? 0) / 1000).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} km`);

  const matched = await prisma.boltTrip.count({ where: { ...inRange, vehicleId: { not: null } } });
  const unmatched = await prisma.boltTrip.count({ where: { ...inRange, vehicleId: null } });
  const distinctUnmatched = await prisma.boltTrip.findMany({
    where: { ...inRange, vehicleId: null, vehicleLicensePlate: { not: null } },
    distinct: ['vehicleLicensePlate'],
    select: { vehicleLicensePlate: true },
  });
  console.log('\n=== Vehicle registry matching (range) ===');
  console.log(`  trips matched to a registry vehicle:   ${matched}`);
  console.log(`  trips with no registry match:          ${unmatched}`);
  console.log(`  distinct unmatched plates:             ${distinctUnmatched.length}`);

  // per-day finished revenue (SAST day boundaries: shift epoch by +2h)
  const perDay = await prisma.$queryRaw<Array<{ day: string; trips: number; gross: number; net: number }>>`
    SELECT date(orderCreatedAt / 1000 + ${SAST_OFFSET_SEC}, 'unixepoch') AS day,
           COUNT(*) AS trips,
           COALESCE(SUM(ridePrice), 0) AS gross,
           COALESCE(SUM(netEarnings), 0) AS net
    FROM BoltTrip
    WHERE orderStatus = 'finished'
      AND orderCreatedAt >= ${rangeStart} AND orderCreatedAt < ${rangeEnd}
    GROUP BY day
    ORDER BY day`;
  console.log('\n=== Per-day (finished, SAST) ===');
  for (const d of perDay) {
    console.log(`  ${d.day}   trips=${Number(d.trips)}   gross=${money(Number(d.gross))}   net=${money(Number(d.net))}`);
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error('runBackfill failed:', err?.response?.status, err?.response?.data ?? err?.message ?? err);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
