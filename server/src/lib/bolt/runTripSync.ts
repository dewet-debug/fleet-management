/**
 * Narrow-window Bolt trip ingest + sanity-check summary. NOT wired into the app.
 *
 *   npx tsx src/lib/bolt/runTripSync.ts [daysBack=1]
 *
 * Pulls getFleetOrders for the window, upserts into bolt_trips, then prints
 * trip counts and revenue totals (ALL price bases) so they can be checked
 * against the manual May 2026 analysis before widening the range.
 */

import prisma from '../../config/database';
import { env } from '../../config/env';
import { BoltTokenClient, httpTokenTransport } from './boltAuth';
import { BoltApiClient } from './boltApiClient';
import { syncBoltTripsWindow } from '../../services/bolt/tripSync.service';

function money(n: number | null | undefined): string {
  return `R ${(n ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function main() {
  const daysBack = Number(process.argv[2] ?? 1);

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
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - daysBack * 24 * 60 * 60;

  console.log(`Company IDs: ${JSON.stringify(companyIds)}`);
  console.log(`Window: ${new Date(startSec * 1000).toISOString()} .. ${new Date(nowSec * 1000).toISOString()} (${daysBack} day(s))\n`);

  console.log('Ingesting...');
  const result = await syncBoltTripsWindow(prisma, api, {
    companyIds,
    startTs: startSec,
    endTs: nowSec,
    triggeredBy: 'runTripSync',
  });
  console.log('Ingest result:', JSON.stringify(result, null, 2));
  tokenClient.stop();

  // --- sanity-check summary over the ingested window ---
  const winStart = new Date(startSec * 1000);
  const winEnd = new Date(nowSec * 1000);
  const inWindow = { orderCreatedAt: { gte: winStart, lte: winEnd } };

  const byStatus = await prisma.boltTrip.groupBy({
    by: ['orderStatus'],
    where: inWindow,
    _count: { _all: true },
  });
  console.log('\n=== Orders by status (window) ===');
  for (const r of byStatus.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${r.orderStatus.padEnd(28)} ${r._count._all}`);
  }

  const finishedWhere = { ...inWindow, orderStatus: 'finished' };
  const finishedAgg = await prisma.boltTrip.aggregate({
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
  });
  const s = finishedAgg._sum;
  console.log('\n=== Finished trips - revenue bases (window) ===');
  console.log(`  finished trips:          ${finishedAgg._count._all}`);
  console.log(`  gross fare (ridePrice):  ${money(s.ridePrice)}`);
  console.log(`  net earnings:            ${money(s.netEarnings)}`);
  console.log(`  commission (Bolt):       ${money(s.commission)}`);
  console.log(`  booking fees:            ${money(s.bookingFee)}`);
  console.log(`  tips:                    ${money(s.tip)}`);
  console.log(`  cash discounts:          ${money(s.cashDiscount)}`);
  console.log(`  toll fees:               ${money(s.tollFee)}`);
  console.log(`  total distance:          ${((s.rideDistanceMeters ?? 0) / 1000).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} km`);

  const matched = await prisma.boltTrip.count({ where: { ...inWindow, vehicleId: { not: null } } });
  const unmatched = await prisma.boltTrip.count({ where: { ...inWindow, vehicleId: null } });
  const distinctUnmatchedPlates = await prisma.boltTrip.findMany({
    where: { ...inWindow, vehicleId: null, vehicleLicensePlate: { not: null } },
    distinct: ['vehicleLicensePlate'],
    select: { vehicleLicensePlate: true },
  });
  console.log('\n=== Vehicle registry matching (window) ===');
  console.log(`  trips matched to a registry vehicle:   ${matched}`);
  console.log(`  trips with no registry match:          ${unmatched}`);
  console.log(`  distinct unmatched plates:             ${distinctUnmatchedPlates.length}`);
  if (distinctUnmatchedPlates.length) {
    console.log(`    e.g. ${distinctUnmatchedPlates.slice(0, 10).map((r) => r.vehicleLicensePlate).join(', ')}`);
  }

  // per-day finished revenue
  const perDay = await prisma.$queryRaw<Array<{ day: string; trips: number; gross: number; net: number }>>`
    SELECT date(orderCreatedAt / 1000, 'unixepoch') AS day,
           COUNT(*) AS trips,
           COALESCE(SUM(ridePrice), 0) AS gross,
           COALESCE(SUM(netEarnings), 0) AS net
    FROM BoltTrip
    WHERE orderStatus = 'finished'
      AND orderCreatedAt >= ${winStart} AND orderCreatedAt <= ${winEnd}
    GROUP BY day
    ORDER BY day`;
  console.log('\n=== Per-day (finished) ===');
  for (const d of perDay) {
    console.log(`  ${d.day}   trips=${Number(d.trips)}   gross=${money(Number(d.gross))}   net=${money(Number(d.net))}`);
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error('runTripSync failed:', err?.response?.status, err?.response?.data ?? err?.message ?? err);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
