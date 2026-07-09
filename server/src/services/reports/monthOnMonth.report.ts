import prisma from '../../config/database';
import { ReportParams, ReportResult, ReportColumn, ReportKpi } from './types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Build the ordered list of YYYY-MM keys for the last `n` months (SAST). */
function monthKeys(n: number): string[] {
  const sastNow = new Date(Date.now() + 2 * 3600 * 1000);
  let y = sastNow.getUTCFullYear();
  let m = sastNow.getUTCMonth(); // 0-based
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    keys.unshift(`${y}-${String(m + 1).padStart(2, '0')}`);
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return keys;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} '${y.slice(2)}`;
}

/** month columns (money or int) plus a total, keyed by the YYYY-MM month keys. */
function monthColumns(keys: string[], entityHeader: string, format: 'money' | 'int'): ReportColumn[] {
  return [
    { key: 'entity', header: entityHeader },
    ...keys.map((k) => ({ key: k, header: monthLabel(k), format, align: 'right' as const })),
    { key: 'total', header: 'Total', format, align: 'right' as const },
  ];
}

function momKpis(
  keys: string[],
  totalsByMonth: Record<string, { gross: number; trips: number }>,
): ReportKpi[] {
  const cur = keys[keys.length - 1];
  const prev = keys[keys.length - 2];
  const curGross = totalsByMonth[cur]?.gross ?? 0;
  const prevGross = totalsByMonth[prev]?.gross ?? 0;
  const change = prevGross > 0 ? (curGross - prevGross) / prevGross : null;
  return [
    { label: `${monthLabel(cur)} revenue`, value: curGross, format: 'money' },
    { label: `${prev ? monthLabel(prev) : 'Prior'} revenue`, value: prevGross, format: 'money' },
    {
      label: 'Month-on-month',
      value: change,
      format: 'percent',
      tone: change == null ? 'neutral' : change >= 0 ? 'success' : 'danger',
    },
    { label: `${monthLabel(cur)} trips`, value: totalsByMonth[cur]?.trips ?? 0, format: 'int' },
  ];
}

interface Bucket {
  name: string;
  gross: Record<string, number>;
  trips: Record<string, number>;
}

function buildSections(
  keys: string[],
  buckets: Map<string, Bucket>,
  entityHeader: string,
): { sections: ReportResult['sections']; totalsByMonth: Record<string, { gross: number; trips: number }> } {
  const totalsByMonth: Record<string, { gross: number; trips: number }> = {};
  for (const k of keys) totalsByMonth[k] = { gross: 0, trips: 0 };

  const grossRows: Record<string, any>[] = [];
  const tripRows: Record<string, any>[] = [];
  for (const [id, b] of buckets) {
    const grossRow: Record<string, any> = { id, entity: b.name };
    const tripRow: Record<string, any> = { id, entity: b.name };
    let grossTotal = 0;
    let tripTotal = 0;
    for (const k of keys) {
      const g = b.gross[k] ?? 0;
      const t = b.trips[k] ?? 0;
      grossRow[k] = g;
      tripRow[k] = t;
      grossTotal += g;
      tripTotal += t;
      totalsByMonth[k].gross += g;
      totalsByMonth[k].trips += t;
    }
    grossRow.total = grossTotal;
    tripRow.total = tripTotal;
    grossRows.push(grossRow);
    tripRows.push(tripRow);
  }

  const latest = keys[keys.length - 1];
  grossRows.sort((a, b) => (b.total as number) - (a.total as number));
  tripRows.sort((a, b) => (b[latest] as number) - (a[latest] as number));

  return {
    totalsByMonth,
    sections: [
      {
        title: 'Gross revenue by month',
        description: 'Finished-trip revenue per month (ZAR).',
        columns: monthColumns(keys, entityHeader, 'money'),
        rows: grossRows,
        emptyMessage: 'No activity in this period.',
      },
      {
        title: 'Finished trips by month',
        columns: monthColumns(keys, entityHeader, 'int'),
        rows: tripRows,
        emptyMessage: 'No activity in this period.',
      },
    ],
  };
}

export async function driverMonthOnMonthReport(params: ReportParams): Promise<ReportResult> {
  const n = Math.min(24, Math.max(2, params.months ?? 6));
  const keys = monthKeys(n);
  const start = new Date(`${keys[0]}-01T00:00:00+02:00`);

  const rows = await prisma.$queryRaw<
    Array<{ driverUuid: string; driverName: string | null; ym: string; gross: number; finished: number }>
  >`
    SELECT driverUuid, MAX(driverName) AS driverName,
           strftime('%Y-%m', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS ym,
           COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
           SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS finished
    FROM BoltTrip
    WHERE orderCreatedAt >= ${start} AND driverUuid IS NOT NULL
    GROUP BY driverUuid, ym`;

  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    let b = buckets.get(r.driverUuid);
    if (!b) {
      b = { name: r.driverName || r.driverUuid.slice(0, 8), gross: {}, trips: {} };
      buckets.set(r.driverUuid, b);
    }
    b.gross[r.ym] = Number(r.gross ?? 0);
    b.trips[r.ym] = Number(r.finished ?? 0);
  }

  const { sections, totalsByMonth } = buildSections(keys, buckets, 'Driver');
  return {
    key: 'driver-month-on-month',
    title: 'Driver Performance — Month on Month',
    description: `Per-driver revenue and trips over the last ${n} months.`,
    window: { from: start.toISOString(), to: new Date().toISOString() },
    kpis: momKpis(keys, totalsByMonth),
    sections,
    generatedAt: new Date().toISOString(),
  };
}

export async function vehicleMonthOnMonthReport(params: ReportParams): Promise<ReportResult> {
  const n = Math.min(24, Math.max(2, params.months ?? 6));
  const keys = monthKeys(n);
  const start = new Date(`${keys[0]}-01T00:00:00+02:00`);

  const [rows, vehicles] = await Promise.all([
    prisma.$queryRaw<Array<{ vehicleId: string; ym: string; gross: number; finished: number }>>`
      SELECT vehicleId,
             strftime('%Y-%m', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS ym,
             COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS finished
      FROM BoltTrip
      WHERE orderCreatedAt >= ${start} AND vehicleId IS NOT NULL
      GROUP BY vehicleId, ym`,
    prisma.vehicle.findMany({ select: { id: true, licensePlate: true, make: true, model: true } }),
  ]);

  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    let b = buckets.get(r.vehicleId);
    if (!b) {
      const v = vById.get(r.vehicleId);
      b = { name: v ? `${v.licensePlate} · ${v.make} ${v.model}` : r.vehicleId.slice(0, 8), gross: {}, trips: {} };
      buckets.set(r.vehicleId, b);
    }
    b.gross[r.ym] = Number(r.gross ?? 0);
    b.trips[r.ym] = Number(r.finished ?? 0);
  }

  const { sections, totalsByMonth } = buildSections(keys, buckets, 'Vehicle');
  return {
    key: 'vehicle-month-on-month',
    title: 'Vehicle Performance — Month on Month',
    description: `Per-vehicle revenue and trips over the last ${n} months.`,
    window: { from: start.toISOString(), to: new Date().toISOString() },
    kpis: momKpis(keys, totalsByMonth),
    sections,
    generatedAt: new Date().toISOString(),
  };
}
