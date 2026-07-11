import prisma from '../../config/database';
import { ReportParams, ReportResult, ChartSpec } from './types';
import { resolveWindow } from './window';

const num = (v: unknown) => Number(v ?? 0);

/**
 * Driver Activity & Hours — the working patterns of the driver base. "Active
 * hours" is a proxy for online/working time: distinct clock-hours in which a
 * driver had at least one Bolt order (Bolt's true online/offline state isn't in
 * the trip feed, so we infer it from order activity). Also: shift span, trips
 * per active hour, and when the fleet is actually on the road.
 */
export async function driverActivityReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);

  const [drivers, hourly] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        driverUuid: string;
        name: string | null;
        daysActive: number;
        activeHourSlots: number;
        finished: number;
        gross: number;
        firstHour: number;
        lastHour: number;
      }>
    >`
      SELECT driverUuid, MAX(driverName) AS name,
             COUNT(DISTINCT date(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS daysActive,
             COUNT(DISTINCT strftime('%Y-%m-%d %H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch'))) AS activeHourSlots,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS finished,
             COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
             MIN(CAST(strftime('%H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS INTEGER)) AS firstHour,
             MAX(CAST(strftime('%H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS INTEGER)) AS lastHour
      FROM BoltTrip
      WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end} AND driverUuid IS NOT NULL
      GROUP BY driverUuid`,
    prisma.$queryRaw<Array<{ hh: string; trips: number; drivers: number }>>`
      SELECT strftime('%H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS hh,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips,
             COUNT(DISTINCT driverUuid) AS drivers
      FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      GROUP BY hh`,
  ]);

  // ---- per-driver rows ----
  const rows = drivers.map((d) => {
    const daysActive = num(d.daysActive);
    const activeHours = num(d.activeHourSlots);
    const finished = num(d.finished);
    const gross = num(d.gross);
    const hrsPerDay = daysActive > 0 ? activeHours / daysActive : 0;
    return {
      id: d.driverUuid,
      driver: d.name || d.driverUuid.slice(0, 8),
      daysActive,
      activeHrsPerDay: Math.round(hrsPerDay * 10) / 10,
      finished,
      gross,
      tripsPerHr: activeHours > 0 ? Math.round((finished / activeHours) * 10) / 10 : null,
      grossPerHr: activeHours > 0 ? gross / activeHours : null,
      shift: `${String(num(d.firstHour)).padStart(2, '0')}h–${String(num(d.lastHour)).padStart(2, '0')}h`,
    };
  });
  rows.sort((a, b) => b.gross - a.gross);

  const activeDrivers = rows.length;
  const avgHrsPerDay = activeDrivers ? rows.reduce((a, r) => a + r.activeHrsPerDay, 0) / activeDrivers : 0;
  const totalFinished = rows.reduce((a, r) => a + r.finished, 0);
  const totalActiveHours = drivers.reduce((a, d) => a + num(d.activeHourSlots), 0);
  const avgTripsPerHr = totalActiveHours ? totalFinished / totalActiveHours : 0;

  // ---- hour-of-day: drivers online + trips ----
  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const driversByHour = Array(24).fill(0);
  const tripsByHour = Array(24).fill(0);
  for (const r of hourly) {
    const h = parseInt(r.hh, 10);
    driversByHour[h] = num(r.drivers);
    tripsByHour[h] = num(r.trips);
  }
  const peakHour = driversByHour.indexOf(Math.max(...driversByHour));

  // ---- utilisation distribution (active hrs/day bands) ----
  const bands = [
    { label: '< 2h', lo: 0, hi: 2 },
    { label: '2–4h', lo: 2, hi: 4 },
    { label: '4–6h', lo: 4, hi: 6 },
    { label: '6–8h', lo: 6, hi: 8 },
    { label: '8h+', lo: 8, hi: 999 },
  ];
  const bandCounts = bands.map((b) => rows.filter((r) => r.activeHrsPerDay >= b.lo && r.activeHrsPerDay < b.hi).length);

  const charts: ChartSpec[] = [
    {
      type: 'bar',
      title: 'Drivers online by hour of day',
      description: 'Distinct drivers with order activity in each hour (SAST) — when the workforce is actually driving.',
      labels: hourLabels,
      series: [{ name: 'Drivers', values: driversByHour, color: 'primary' }],
      valueFormat: 'int',
      highlightIndex: peakHour,
    },
    {
      type: 'bar',
      title: 'Trips by hour of day',
      description: 'Finished trips per hour — the productive-output curve.',
      labels: hourLabels,
      series: [{ name: 'Trips', values: tripsByHour, color: 'peri' }],
      valueFormat: 'int',
    },
    {
      type: 'bar',
      title: 'Driver utilisation — active hours per day',
      description: 'How many drivers fall in each daily active-hours band. Left-skew = under-utilised drivers.',
      labels: bands.map((b) => b.label),
      series: [{ name: 'Drivers', values: bandCounts, color: 'info' }],
      valueFormat: 'int',
    },
  ];

  return {
    key: 'driver-activity',
    title: 'Driver Activity & Hours',
    description:
      'When drivers work and how hard. "Active hours" = distinct hours with Bolt order activity (a proxy for online time — Bolt online/offline state is not in the trip feed).',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      { label: 'Active drivers', value: activeDrivers, format: 'int' },
      { label: 'Avg active hrs/day', value: Math.round(avgHrsPerDay * 10) / 10, format: 'number' },
      { label: 'Peak hour', value: `${hourLabels[peakHour]}:00`, sub: `${driversByHour[peakHour]} drivers` },
      { label: 'Avg trips / active hr', value: Math.round(avgTripsPerHr * 10) / 10, format: 'number' },
      { label: 'Finished trips', value: totalFinished, format: 'int' },
    ],
    charts,
    sections: [
      {
        title: `Driver working patterns (${rows.length})`,
        description: 'Ranked by revenue. Shift = earliest–latest active hour across the window.',
        columns: [
          { key: 'driver', header: 'Driver' },
          { key: 'daysActive', header: 'Days', format: 'int', align: 'right' },
          { key: 'activeHrsPerDay', header: 'Active hrs/day', format: 'number', align: 'right' },
          { key: 'shift', header: 'Typical shift' },
          { key: 'finished', header: 'Trips', format: 'int', align: 'right' },
          { key: 'tripsPerHr', header: 'Trips/hr', format: 'number', align: 'right' },
          { key: 'gross', header: 'Gross', format: 'money', align: 'right' },
          { key: 'grossPerHr', header: 'Gross/hr', format: 'money', align: 'right' },
        ],
        rows,
        emptyMessage: 'No driver activity in this window.',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
