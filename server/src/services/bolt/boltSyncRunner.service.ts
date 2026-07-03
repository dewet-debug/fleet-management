import prisma from '../../config/database';
import { env } from '../../config/env';
import { BoltTokenClient, httpTokenTransport } from '../../lib/bolt/boltAuth';
import { BoltApiClient } from '../../lib/bolt/boltApiClient';
import { syncBoltTripsWindow } from './tripSync.service';

/**
 * UI-triggered Bolt trip download. Builds an API client from env credentials,
 * day-chunks the requested date range (SAST calendar days, to stay within the
 * API's per-request range limit), and upserts into bolt_trips — recording the
 * run in bolt_sync_log. Runs in the background (fire-and-forget) like the
 * Cartrack sync; the console polls the sync-logs.
 */

let isBoltSyncRunning = false;

function credsPresent() {
  return !!(env.BOLT_CLIENT_ID && env.BOLT_CLIENT_SECRET);
}

/** Unix seconds for YYYY-MM-DD at 00:00 SAST. */
function sastDayStartSec(ymd: string): number {
  return Math.floor(Date.parse(`${ymd}T00:00:00+02:00`) / 1000);
}
function addDaysYMD(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getBoltStatus() {
  const connected = credsPresent();
  const [totalTrips, lastLog, lastTrip, firstTrip, companies] = await Promise.all([
    prisma.boltTrip.count(),
    prisma.boltSyncLog.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.boltTrip.findFirst({ orderBy: { orderCreatedAt: 'desc' }, select: { orderCreatedAt: true } }),
    prisma.boltTrip.findFirst({ orderBy: { orderCreatedAt: 'asc' }, select: { orderCreatedAt: true } }),
    prisma.boltTrip.findMany({ where: { companyId: { not: null } }, distinct: ['companyId'], select: { companyId: true } }),
  ]);
  return {
    connected,
    tokenUrl: env.BOLT_OIDC_TOKEN_URL,
    scope: env.BOLT_OAUTH_SCOPE,
    companyIds: companies.map((c) => c.companyId).filter((x): x is number => x != null),
    totalTrips,
    earliestTripAt: firstTrip?.orderCreatedAt ?? null,
    latestTripAt: lastTrip?.orderCreatedAt ?? null,
    lastSync: lastLog
      ? { id: lastLog.id, status: lastLog.status, startedAt: lastLog.startedAt, completedAt: lastLog.completedAt }
      : null,
    running: isBoltSyncRunning,
  };
}

/**
 * Kicks off a background download for the given SAST date range. Returns the
 * sync-log id immediately; the console watches the log for progress/result.
 */
export async function startBoltTripsSync(params: {
  dateFrom: string;
  dateTo: string;
  timeRangeFilterType?: 'created' | 'price_review';
  triggeredBy?: string;
}) {
  if (!credsPresent()) {
    throw Object.assign(new Error('Bolt credentials are not configured (BOLT_CLIENT_ID / BOLT_CLIENT_SECRET).'), { status: 400 });
  }
  if (isBoltSyncRunning) {
    throw Object.assign(new Error('A Bolt sync is already running.'), { status: 409 });
  }
  if (!params.dateFrom || !params.dateTo || params.dateFrom > params.dateTo) {
    throw Object.assign(new Error('Invalid date range.'), { status: 400 });
  }

  const log = await prisma.boltSyncLog.create({
    data: {
      syncType: 'trips',
      status: 'RUNNING',
      triggeredBy: params.triggeredBy ?? 'console',
      windowStart: new Date(sastDayStartSec(params.dateFrom) * 1000),
      windowEnd: new Date(sastDayStartSec(addDaysYMD(params.dateTo, 1)) * 1000),
    },
  });

  // fire-and-forget
  runInternal(log.id, params.dateFrom, params.dateTo, params.timeRangeFilterType).catch((err) => {
    console.error('[Bolt] Unhandled sync error:', err);
  });

  return { syncLogId: log.id };
}

async function runInternal(
  logId: string,
  dateFrom: string,
  dateTo: string,
  timeRangeFilterType?: 'created' | 'price_review',
) {
  isBoltSyncRunning = true;
  const started = Date.now();
  const totals = { fetched: 0, created: 0, updated: 0, matched: 0, errored: 0 };

  const tokenClient = new BoltTokenClient({
    clientId: env.BOLT_CLIENT_ID,
    clientSecret: env.BOLT_CLIENT_SECRET,
    tokenUrl: env.BOLT_OIDC_TOKEN_URL,
    scope: env.BOLT_OAUTH_SCOPE,
    transport: httpTokenTransport,
  });
  const api = new BoltApiClient({ tokenClient });

  try {
    const companyIds = await api.getCompanies();
    if (companyIds.length === 0) throw new Error('No companies accessible with these credentials.');

    for (let day = dateFrom; day <= dateTo; day = addDaysYMD(day, 1)) {
      const startTs = sastDayStartSec(day);
      const endTs = sastDayStartSec(addDaysYMD(day, 1));
      const r = await syncBoltTripsWindow(prisma, api, {
        companyIds,
        startTs,
        endTs,
        timeRangeFilterType,
        triggeredBy: 'console',
        pageLimit: 1000,
      });
      totals.fetched += r.fetched;
      totals.created += r.created;
      totals.updated += r.updated;
      totals.matched += r.matchedToVehicle;
      totals.errored += r.errored;
    }

    await prisma.boltSyncLog.update({
      where: { id: logId },
      data: {
        status: totals.errored > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        completedAt: new Date(),
        recordsFetched: totals.fetched,
        recordsCreated: totals.created,
        recordsUpdated: totals.updated,
        recordsMatched: totals.matched,
        recordsErrored: totals.errored,
        durationMs: Date.now() - started,
      },
    });
  } catch (err) {
    await prisma.boltSyncLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: (err as Error).message,
        durationMs: Date.now() - started,
      },
    });
  } finally {
    tokenClient.stop();
    isBoltSyncRunning = false;
  }
}
