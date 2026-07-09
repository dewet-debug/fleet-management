import prisma from '../../config/database';
import { ReportParams, ReportResult, ChartSpec } from './types';
import { resolveWindow, DAY_MS } from './window';

const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first display order
const num = (v: unknown) => Number(v ?? 0);

/**
 * Demand & Revenue Patterns — the "when" of the business. Daily trend with a
 * prior-period comparison, plus cyclical breakdowns: day-of-week, day-of-month
 * (month-end vs mid-month), hour-of-day, and a day×hour demand heatmap. All
 * Bolt, SAST-anchored.
 */
export async function demandPatternsReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);
  const priorStart = new Date(start.getTime() - windowDays * DAY_MS);

  const [daily, hourly, heat, prior] = await Promise.all([
    prisma.$queryRaw<Array<{ d: string; gross: number; net: number; trips: number; orders: number }>>`
      SELECT date(orderCreatedAt / 1000 + 7200, 'unixepoch') AS d,
             COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross,
             COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN netEarnings END), 0) AS net,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips,
             COUNT(*) AS orders
      FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      GROUP BY d ORDER BY d`,
    prisma.$queryRaw<Array<{ hh: string; trips: number; gross: number }>>`
      SELECT strftime('%H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS hh,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips,
             COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross
      FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      GROUP BY hh`,
    prisma.$queryRaw<Array<{ dow: string; hh: string; trips: number }>>`
      SELECT strftime('%w', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS dow,
             strftime('%H', datetime(orderCreatedAt / 1000 + 7200, 'unixepoch')) AS hh,
             SUM(CASE WHEN orderStatus = 'finished' THEN 1 ELSE 0 END) AS trips
      FROM BoltTrip WHERE orderCreatedAt >= ${start} AND orderCreatedAt <= ${end}
      GROUP BY dow, hh`,
    prisma.$queryRaw<Array<{ gross: number }>>`
      SELECT COALESCE(SUM(CASE WHEN orderStatus = 'finished' THEN ridePrice END), 0) AS gross
      FROM BoltTrip WHERE orderCreatedAt >= ${priorStart} AND orderCreatedAt < ${start}`,
  ]);

  // ---- daily ----
  const days = daily.map((r) => r.d);
  const grossByDay = daily.map((r) => num(r.gross));
  const netByDay = daily.map((r) => num(r.net));
  const totalGross = grossByDay.reduce((a, b) => a + b, 0);
  const priorGross = num(prior[0]?.gross);
  const periodChange = priorGross > 0 ? (totalGross - priorGross) / priorGross : null;

  // ---- day-of-week & day-of-month (average per occurrence) ----
  const dowSum = Array(7).fill(0);
  const dowCnt = Array(7).fill(0);
  const domSum = Array(32).fill(0);
  const domCnt = Array(32).fill(0);
  for (const r of daily) {
    const dow = new Date(`${r.d}T00:00:00Z`).getUTCDay();
    const dom = parseInt(r.d.slice(8, 10), 10);
    dowSum[dow] += num(r.gross);
    dowCnt[dow] += 1;
    domSum[dom] += num(r.gross);
    domCnt[dom] += 1;
  }
  const dowAvg = DOW_ORDER.map((d) => (dowCnt[d] ? dowSum[d] / dowCnt[d] : 0));
  const dowLabels = DOW_ORDER.map((d) => DOW_LABEL[d]);
  const bestDowIdx = dowAvg.indexOf(Math.max(...dowAvg));

  const domLabels = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const domAvg = domLabels.map((_, i) => (domCnt[i + 1] ? domSum[i + 1] / domCnt[i + 1] : 0));

  const bucketAvg = (lo: number, hi: number) => {
    let s = 0;
    let c = 0;
    for (let d = lo; d <= hi; d++) {
      s += domSum[d];
      c += domCnt[d];
    }
    return c ? s / c : 0;
  };
  const earlyAvg = bucketAvg(1, 10);
  const midAvg = bucketAvg(11, 20);
  const endAvg = bucketAvg(21, 31);
  const monthEndLift = midAvg > 0 ? (endAvg - midAvg) / midAvg : null;

  const weekdayAvg = ([1, 2, 3, 4, 5].reduce((a, d) => a + dowSum[d], 0)) /
    ([1, 2, 3, 4, 5].reduce((a, d) => a + dowCnt[d], 0) || 1);
  const weekendAvg = ([0, 6].reduce((a, d) => a + dowSum[d], 0)) /
    ([0, 6].reduce((a, d) => a + dowCnt[d], 0) || 1);
  const weekendLift = weekdayAvg > 0 ? (weekendAvg - weekdayAvg) / weekdayAvg : null;

  // ---- hour-of-day ----
  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const tripsByHour = Array(24).fill(0);
  const grossByHour = Array(24).fill(0);
  for (const r of hourly) {
    const h = parseInt(r.hh, 10);
    tripsByHour[h] = num(r.trips);
    grossByHour[h] = num(r.gross);
  }
  const bestHour = tripsByHour.indexOf(Math.max(...tripsByHour));

  // ---- heatmap dow x hour ----
  const matrix = DOW_ORDER.map(() => Array(24).fill(0));
  for (const r of heat) {
    const dow = parseInt(r.dow, 10);
    const rowIdx = DOW_ORDER.indexOf(dow);
    const h = parseInt(r.hh, 10);
    if (rowIdx >= 0) matrix[rowIdx][h] = num(r.trips);
  }

  const charts: ChartSpec[] = [
    {
      type: 'line',
      title: 'Daily revenue trend',
      description: 'Gross (solid) and net (dashed) finished-trip revenue per day.',
      labels: days.map((d) => d.slice(5)),
      series: [
        { name: 'Gross', values: grossByDay, color: 'peri' },
        { name: 'Net', values: netByDay, color: 'success', dashed: true },
      ],
      valueFormat: 'money',
    },
    {
      type: 'bar',
      title: 'Average revenue by day of week',
      description: 'Mean gross per occurrence of each weekday — controls for uneven weekday counts.',
      labels: dowLabels,
      series: [{ name: 'Avg gross', values: dowAvg, color: 'primary' }],
      valueFormat: 'money',
      highlightIndex: bestDowIdx,
    },
    {
      type: 'bar',
      title: 'Average revenue by day of month',
      description: 'Mean gross per calendar day — surfaces the month-end vs mid-month cycle.',
      labels: domLabels,
      series: [{ name: 'Avg gross', values: domAvg, color: 'info' }],
      valueFormat: 'money',
    },
    {
      type: 'bar',
      title: 'Trips by hour of day',
      description: 'Finished trips per hour (SAST) — the daily demand curve.',
      labels: hourLabels,
      series: [{ name: 'Trips', values: tripsByHour, color: 'peri' }],
      valueFormat: 'int',
      highlightIndex: bestHour,
    },
    {
      type: 'heatmap',
      title: 'Demand heatmap — day × hour',
      description: 'Finished trips by weekday and hour. Darker = busier.',
      labels: hourLabels,
      rowLabels: dowLabels,
      matrix,
      valueFormat: 'int',
    },
  ];

  return {
    key: 'demand-patterns',
    title: 'Demand & Revenue Patterns',
    description: 'When the fleet earns — daily trend, weekday and month cycles, and time-of-day demand.',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      { label: 'Gross (period)', value: totalGross, format: 'money' },
      {
        label: 'vs prior period',
        value: periodChange,
        format: 'percent',
        tone: periodChange == null ? 'neutral' : periodChange >= 0 ? 'success' : 'danger',
      },
      { label: 'Best weekday', value: dowLabels[bestDowIdx], sub: `avg ${Math.round(dowAvg[bestDowIdx])}` },
      { label: 'Peak hour', value: `${hourLabels[bestHour]}:00`, sub: `${tripsByHour[bestHour]} trips` },
      {
        label: 'Weekend lift',
        value: weekendLift,
        format: 'percent',
        tone: weekendLift == null ? 'neutral' : weekendLift >= 0 ? 'success' : 'warning',
      },
      {
        label: 'Month-end lift',
        value: monthEndLift,
        format: 'percent',
        tone: monthEndLift == null ? 'neutral' : monthEndLift >= 0 ? 'success' : 'warning',
      },
    ],
    charts,
    sections: [
      {
        title: 'Revenue by day of week',
        columns: [
          { key: 'day', header: 'Day' },
          { key: 'avgGross', header: 'Avg gross', format: 'money', align: 'right' },
          { key: 'days', header: 'Days', format: 'int', align: 'right' },
        ],
        rows: dowLabels.map((d, i) => ({
          id: d,
          day: d,
          avgGross: Math.round(dowAvg[i]),
          days: dowCnt[DOW_ORDER[i]],
        })),
      },
      {
        title: 'Month cycle (avg gross per day)',
        columns: [
          { key: 'bucket', header: 'Period' },
          { key: 'avgGross', header: 'Avg gross/day', format: 'money', align: 'right' },
        ],
        rows: [
          { id: 'e', bucket: 'Early (1–10)', avgGross: Math.round(earlyAvg) },
          { id: 'm', bucket: 'Mid (11–20)', avgGross: Math.round(midAvg) },
          { id: 'l', bucket: 'Month-end (21–31)', avgGross: Math.round(endAvg) },
        ],
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
