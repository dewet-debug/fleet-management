import { getDriverPerformance } from '../analytics/driverPerformance.service';
import { getVehicleProfitability } from '../analytics/profitability.service';
import { ReportParams, ReportResult, ReportColumn } from './types';

const MIN_OFFERED = 20; // minimum sample before a driver counts as a "poor performer"
const TOP_N = 15;

const DRIVER_COLS: ReportColumn[] = [
  { key: 'driver', header: 'Driver' },
  { key: 'finished', header: 'Trips', format: 'int', align: 'right' },
  { key: 'grossRevenue', header: 'Gross', format: 'money', align: 'right' },
  { key: 'netEarnings', header: 'Net', format: 'money', align: 'right' },
  { key: 'acceptanceRate', header: 'Accept', format: 'percent', align: 'right' },
  { key: 'completionRate', header: 'Complete', format: 'percent', align: 'right' },
  { key: 'cancellationRate', header: 'Cancel', format: 'percent', align: 'right' },
  { key: 'activeDays', header: 'Active days', format: 'int', align: 'right' },
];

export async function driverLeaderboardReport(params: ReportParams): Promise<ReportResult> {
  const data = await getDriverPerformance(params);
  const rows = data.drivers.map((d, i) => ({
    id: d.driverUuid,
    rank: i + 1,
    driver: d.driverName || d.driverUuid.slice(0, 8),
    finished: d.finished,
    offered: d.offered,
    grossRevenue: d.grossRevenue,
    netEarnings: d.netEarnings,
    acceptanceRate: d.acceptanceRate,
    completionRate: d.completionRate,
    cancellationRate: d.cancellationRate,
    activeDays: d.activeDays,
  }));

  const byRevenue = [...rows].sort((a, b) => b.grossRevenue - a.grossRevenue);
  const eligible = rows.filter((r) => r.offered >= MIN_OFFERED);
  const lowAcceptance = [...eligible]
    .filter((r) => r.acceptanceRate != null)
    .sort((a, b) => (a.acceptanceRate ?? 0) - (b.acceptanceRate ?? 0))
    .slice(0, TOP_N);
  const highCancellation = [...eligible]
    .filter((r) => (r.cancellationRate ?? 0) > 0)
    .sort((a, b) => (b.cancellationRate ?? 0) - (a.cancellationRate ?? 0))
    .slice(0, TOP_N);

  return {
    key: 'driver-leaderboard',
    title: 'Driver Performance Leaderboard',
    description: 'Top and poor performers by revenue, acceptance, completion and cancellation (Bolt).',
    window: { from: data.window.from, to: data.window.to },
    kpis: [
      { label: 'Active drivers', value: data.totals.drivers, format: 'int' },
      { label: 'Finished trips', value: data.totals.finished, format: 'int' },
      { label: 'Gross revenue', value: data.totals.grossRevenue, format: 'money' },
      { label: 'Fleet acceptance', value: data.totals.acceptanceRate, format: 'percent' },
      { label: 'Fleet completion', value: data.totals.completionRate, format: 'percent' },
    ],
    sections: [
      {
        title: `Top performers by revenue (${Math.min(TOP_N, byRevenue.length)})`,
        tone: 'success',
        columns: DRIVER_COLS,
        rows: byRevenue.slice(0, TOP_N),
        emptyMessage: 'No driver activity in this period.',
      },
      {
        title: `Poor performers — lowest acceptance (${lowAcceptance.length})`,
        description: `Drivers with at least ${MIN_OFFERED} offers, ranked by lowest acceptance rate.`,
        tone: 'warning',
        columns: DRIVER_COLS,
        rows: lowAcceptance,
        emptyMessage: 'No drivers meet the minimum sample size.',
      },
      {
        title: `Highest cancellation after accept (${highCancellation.length})`,
        tone: 'danger',
        columns: DRIVER_COLS,
        rows: highCancellation,
        emptyMessage: 'No post-accept cancellations in this period. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

const VEHICLE_COLS: ReportColumn[] = [
  { key: 'plate', header: 'Plate' },
  { key: 'vehicle', header: 'Vehicle' },
  { key: 'finishedTrips', header: 'Trips', format: 'int', align: 'right' },
  { key: 'grossRevenue', header: 'Gross', format: 'money', align: 'right' },
  { key: 'netEarnings', header: 'Net', format: 'money', align: 'right' },
  { key: 'distanceKm', header: 'Distance', format: 'km', align: 'right' },
  { key: 'revenuePerKm', header: 'Rev/km', format: 'money', align: 'right' },
  { key: 'utilisation', header: 'Utilisation', format: 'percent', align: 'right' },
  { key: 'netProfit', header: 'Net profit', format: 'money', align: 'right' },
];

export async function vehicleLeaderboardReport(params: ReportParams): Promise<ReportResult> {
  const data = await getVehicleProfitability(params);
  const rows = data.vehicles.map((v) => ({
    id: v.vehicleId,
    plate: v.licensePlate,
    vehicle: `${v.make} ${v.model}`,
    finishedTrips: v.finishedTrips,
    grossRevenue: v.grossRevenue,
    netEarnings: v.netEarnings,
    distanceKm: v.distanceKm,
    revenuePerKm: v.revenuePerKm,
    revenuePerActiveDay: v.revenuePerActiveDay,
    utilisation: v.utilisation,
    netProfit: v.netProfit,
  }));

  const byRevenue = [...rows].sort((a, b) => b.grossRevenue - a.grossRevenue);
  const lowestPerDay = [...rows]
    .filter((r) => (r.revenuePerActiveDay ?? 0) > 0)
    .sort((a, b) => (a.revenuePerActiveDay ?? 0) - (b.revenuePerActiveDay ?? 0))
    .slice(0, TOP_N);
  const hasProfit = rows.some((r) => r.netProfit != null);
  const byProfit = [...rows]
    .filter((r) => r.netProfit != null)
    .sort((a, b) => (b.netProfit ?? 0) - (a.netProfit ?? 0));

  const sections = [
    {
      title: `Top vehicles by gross revenue (${Math.min(TOP_N, byRevenue.length)})`,
      tone: 'success' as const,
      columns: VEHICLE_COLS,
      rows: byRevenue.slice(0, TOP_N),
      emptyMessage: 'No vehicle Bolt activity in this period.',
    },
    {
      title: `Underperformers — lowest revenue per active day (${lowestPerDay.length})`,
      tone: 'warning' as const,
      columns: VEHICLE_COLS,
      rows: lowestPerDay,
      emptyMessage: 'No vehicle activity in this period.',
    },
  ];
  if (hasProfit) {
    sections.push({
      title: `Most profitable (net of running costs) (${Math.min(TOP_N, byProfit.length)})`,
      tone: 'info' as any,
      columns: VEHICLE_COLS,
      rows: byProfit.slice(0, TOP_N),
      emptyMessage: 'No cost data captured yet.',
    });
  }

  return {
    key: 'vehicle-leaderboard',
    title: 'Vehicle Profitability Leaderboard',
    description: 'Top and under-performing vehicles by revenue, efficiency and net profit.',
    window: { from: data.window.from, to: data.window.to, days: data.window.days },
    kpis: [
      { label: 'Vehicles active', value: data.totals.vehicles, format: 'int' },
      { label: 'Gross revenue', value: data.totals.grossRevenue, format: 'money' },
      { label: 'Distance', value: data.totals.distanceKm, format: 'km' },
      { label: 'Revenue / km', value: data.totals.revenuePerKm, format: 'money' },
      {
        label: 'Net profit',
        value: data.totals.netProfit,
        format: 'money',
        sub: hasProfit ? undefined : 'awaiting cost data',
      },
    ],
    sections,
    generatedAt: new Date().toISOString(),
  };
}
