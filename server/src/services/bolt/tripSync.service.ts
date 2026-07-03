import { PrismaClient } from '@prisma/client';
import { BoltApiClient } from '../../lib/bolt/boltApiClient';
import { mapFleetOrderToBoltTrip } from '../../lib/bolt/boltTripMapper';
import { TimeRangeFilterType } from '../../lib/bolt/boltApiTypes';

const CHUNK = 200; // keep well under SQLite's parameter limit

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface BoltTripSyncParams {
  companyIds: number[];
  /** Unix seconds. */
  startTs: number;
  /** Unix seconds. */
  endTs: number;
  timeRangeFilterType?: TimeRangeFilterType;
  triggeredBy?: string;
  /** Page size for getFleetOrders paging (1-1000). */
  pageLimit?: number;
  /**
   * Whether to record this window in bolt_sync_log. Default true. The console
   * runner day-chunks a range and keeps its own single outer log, so it passes
   * false to avoid one log row per day cluttering the sync history.
   */
  logToDb?: boolean;
}

export interface BoltTripSyncResult {
  fetched: number;
  created: number;
  updated: number;
  matchedToVehicle: number;
  unmatchedPlates: number;
  errored: number;
  durationMs: number;
  syncLogId: string;
}

/**
 * Pulls all fleet orders in a window, resolves each to a registry vehicle by
 * license plate, and upserts them into bolt_trips (keyed by orderReference).
 * Records the run in bolt_sync_log.
 */
export async function syncBoltTripsWindow(
  prisma: PrismaClient,
  api: BoltApiClient,
  params: BoltTripSyncParams,
): Promise<BoltTripSyncResult> {
  const startedAt = Date.now();
  const syncLog =
    params.logToDb === false
      ? null
      : await prisma.boltSyncLog.create({
          data: {
            syncType: 'trips',
            status: 'RUNNING',
            triggeredBy: params.triggeredBy ?? 'manual',
            windowStart: new Date(params.startTs * 1000),
            windowEnd: new Date(params.endTs * 1000),
          },
        });

  try {
    const response = await api.getAllFleetOrders(
      {
        company_ids: params.companyIds,
        company_id: params.companyIds[0],
        start_ts: params.startTs,
        end_ts: params.endTs,
        time_range_filter_type: params.timeRangeFilterType,
      },
      params.pageLimit ?? 1000,
    );

    // Pagination by offset can return the same order twice if new orders land
    // mid-scan. Dedupe by order_reference (keep the latest) before upserting.
    const dedup = new Map<string, (typeof response.orders)[number]>();
    for (const o of response.orders) dedup.set(o.order_reference, o);
    const orders = Array.from(dedup.values());

    // Resolve plate -> vehicleId in one pass over the registry.
    const plates = Array.from(
      new Set(orders.map((o) => o.vehicle_license_plate).filter((p): p is string => !!p)),
    );
    const plateToVehicleId = new Map<string, string>();
    for (const batch of chunk(plates, CHUNK)) {
      const vehicles = await prisma.vehicle.findMany({
        where: { licensePlate: { in: batch } },
        select: { id: true, licensePlate: true },
      });
      for (const v of vehicles) plateToVehicleId.set(v.licensePlate, v.id);
    }

    // Map every order once, resolving its registry vehicle by plate.
    let matched = 0;
    const mapped = orders.map((order) => {
      const vehicleId = order.vehicle_license_plate
        ? plateToVehicleId.get(order.vehicle_license_plate) ?? null
        : null;
      if (vehicleId) matched++;
      return {
        ref: order.order_reference,
        data: mapFleetOrderToBoltTrip(order, { companyId: response.company_id, vehicleId }),
      };
    });

    // Split into inserts (new refs) and updates (already stored). Bulk-insert
    // the new ones (fast for backfills); update the rest individually.
    const existing = new Set<string>();
    for (const batch of chunk(mapped.map((m) => m.ref), CHUNK)) {
      const rows = await prisma.boltTrip.findMany({
        where: { orderReference: { in: batch } },
        select: { orderReference: true },
      });
      for (const r of rows) existing.add(r.orderReference);
    }
    const toCreate = mapped.filter((m) => !existing.has(m.ref));
    const toUpdate = mapped.filter((m) => existing.has(m.ref));

    let created = 0;
    let updated = 0;
    let errored = 0;

    for (const batch of chunk(toCreate, CHUNK)) {
      try {
        const res = await prisma.boltTrip.createMany({ data: batch.map((m) => m.data) });
        created += res.count;
      } catch (err) {
        // Fall back to per-row so one bad record can't drop the whole batch.
        console.error(`[Bolt] createMany batch failed, retrying per-row:`, (err as Error).message);
        for (const m of batch) {
          try {
            await prisma.boltTrip.create({ data: m.data });
            created++;
          } catch (e) {
            errored++;
            console.error(`[Bolt] create failed for ${m.ref}:`, (e as Error).message);
          }
        }
      }
    }

    for (const m of toUpdate) {
      try {
        await prisma.boltTrip.update({
          where: { orderReference: m.ref },
          data: { ...m.data, syncedAt: new Date() },
        });
        updated++;
      } catch (err) {
        errored++;
        console.error(`[Bolt] update failed for ${m.ref}:`, (err as Error).message);
      }
    }

    const result: BoltTripSyncResult = {
      fetched: orders.length,
      created,
      updated,
      matchedToVehicle: matched,
      unmatchedPlates: orders.length - matched,
      errored,
      durationMs: Date.now() - startedAt,
      syncLogId: syncLog?.id ?? '',
    };

    if (syncLog) {
      await prisma.boltSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errored > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          completedAt: new Date(),
          recordsFetched: result.fetched,
          recordsCreated: result.created,
          recordsUpdated: result.updated,
          recordsMatched: result.matchedToVehicle,
          recordsErrored: result.errored,
          durationMs: result.durationMs,
        },
      });
    }

    return result;
  } catch (err) {
    if (syncLog) {
      await prisma.boltSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: (err as Error).message,
          durationMs: Date.now() - startedAt,
        },
      });
    }
    throw err;
  }
}
