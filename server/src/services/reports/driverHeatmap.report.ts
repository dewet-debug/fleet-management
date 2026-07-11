import prisma from '../../config/database';
import { ReportParams, ReportResult, ChartSpec } from './types';
import { resolveWindow } from './window';

const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first
const num = (v: unknown) => Number(v ?? 0);

/**
 * Per-driver schedule heatmap — pick a driver, see their day-of-week × hour-of-day
 * activity (finished trips). Surfaces each driver's working pattern individually.
 */
export async function driverHeatmapReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);

  // driver options for the selector (busiest first)
  const drivers = await prisma.$queryRaw<Array<{ driverUuid: string; name: string | null; trips: number }>>`
    SELECT driverUuid, MAX(driverName) AS name,
           SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips
    FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end} AND driverUuid IS NOT NULL
    GROUP BY driverUuid HAVING trips > 0 ORDER BY trips DESC LIMIT 500`;

  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const dowLabels = DOW_ORDER.map((d) => DOW_LABEL[d]);

  if (drivers.length === 0) {
    return {
      key: 'driver-heatmap',
      title: 'Driver Schedule Heatmap',
      description: 'Per-driver day × hour activity.',
      window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
      kpis: [{ label: 'Drivers', value: 0, format: 'int' }],
      charts: [],
      sections: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const selected =
    params.driverUuid && drivers.some((d) => d.driverUuid === params.driverUuid)
      ? params.driverUuid
      : drivers[0].driverUuid;
  const selDriver = drivers.find((d) => d.driverUuid === selected)!;

  const [stats, heat] = await Promise.all([
    prisma.$queryRaw<Array<{ trips: number; gross: number; daysActive: number }>>`
      SELECT SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips,
             COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
             COUNT(DISTINCT date(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS daysActive
      FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end} AND driverUuid = ${selected}`,
    prisma.$queryRaw<Array<{ dow: string; hh: string; trips: number }>>`
      SELECT strftime('%w', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS dow,
             strftime('%H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS hh,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips
      FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end} AND driverUuid = ${selected}
      GROUP BY dow, hh`,
  ]);

  // 7×24 matrix + margins
  const matrix = DOW_ORDER.map(() => Array(24).fill(0));
  const byHour = Array(24).fill(0);
  const byDow = Array(7).fill(0); // indexed in display order
  for (const r of heat) {
    const dow = parseInt(r.dow, 10);
    const rowIdx = DOW_ORDER.indexOf(dow);
    const h = parseInt(r.hh, 10);
    const t = num(r.trips);
    if (rowIdx >= 0) {
      matrix[rowIdx][h] = t;
      byHour[h] += t;
      byDow[rowIdx] += t;
    }
  }
  const busiestHour = byHour.indexOf(Math.max(...byHour));
  const busiestDow = byDow.indexOf(Math.max(...byDow));
  const s = stats[0] ?? { trips: 0, gross: 0, daysActive: 0 };

  const charts: ChartSpec[] = [
    {
      type: 'heatmap',
      title: `${selDriver.name || selected.slice(0, 8)} — day × hour`,
      description: 'Finished trips by weekday and hour (SAST). Darker = busier.',
      labels: hourLabels,
      rowLabels: dowLabels,
      matrix,
      valueFormat: 'int',
    },
    {
      type: 'bar',
      title: 'Trips by hour of day',
      description: "This driver's daily demand curve.",
      labels: hourLabels,
      series: [{ name: 'Trips', values: byHour, color: 'peri' }],
      valueFormat: 'int',
      highlightIndex: busiestHour,
    },
  ];

  return {
    key: 'driver-heatmap',
    title: 'Driver Schedule Heatmap',
    description: 'Pick a driver to see when they work — day-of-week × hour-of-day activity.',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    selector: {
      param: 'driverUuid',
      label: 'Driver',
      value: selected,
      options: drivers.map((d) => ({
        value: d.driverUuid,
        label: `${d.name || d.driverUuid.slice(0, 8)} · ${num(d.trips)} trips`,
      })),
    },
    kpis: [
      { label: 'Finished trips', value: num(s.trips), format: 'int' },
      { label: 'Active days', value: num(s.daysActive), format: 'int' },
      { label: 'Gross', value: num(s.gross), format: 'money' },
      { label: 'Busiest day', value: dowLabels[busiestDow], sub: `${byDow[busiestDow]} trips` },
      { label: 'Busiest hour', value: `${hourLabels[busiestHour]}:00`, sub: `${byHour[busiestHour]} trips` },
    ],
    charts,
    sections: [
      {
        title: 'Trips by weekday',
        columns: [
          { key: 'day', header: 'Day' },
          { key: 'trips', header: 'Trips', format: 'int', align: 'right' },
        ],
        rows: dowLabels.map((d, i) => ({ id: d, day: d, trips: byDow[i] })),
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
