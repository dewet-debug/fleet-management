import prisma from '../../config/database';
import { getDriverPerformance } from '../analytics/driverPerformance.service';
import { getVehicleProfitability } from '../analytics/profitability.service';
import { ReportParams, ReportResult, ChartSpec } from './types';
import { resolveWindow } from './window';

/**
 * Fleet Health — the executive one-screen view. Pulls the three levers that are
 * really one problem — utilisation, collections and driver conversion — together
 * with the financial position, and lists the vehicles and drivers dragging the
 * fleet down so there's a concrete action list.
 */
export async function fleetHealthReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);

  const [fin, statusRows, driverPerf, prof, activeVehicles] = await Promise.all([
    prisma.fleetFinancialMonth.findMany({ orderBy: { month: 'asc' } }),
    prisma.boltTrip.groupBy({
      by: ['orderStatus'],
      where: { orderCreatedAt: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    getDriverPerformance(params),
    getVehicleProfitability(params),
    prisma.vehicle.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, licensePlate: true, make: true, model: true },
    }),
  ]);

  // ---- financials ----
  const months = fin.map((f) => f.monthLabel);
  const delivered = fin.map((f) => f.vehiclesDelivered ?? 0);
  const active = fin.map((f) => f.vehiclesActive ?? 0);
  const collPct = fin.map((f) => (f.billedGross > 0 ? f.collected / f.billedGross : 0));
  const profitFund = fin.map((f) => f.profitFundBalance ?? 0);
  const totalBilled = fin.reduce((a, f) => a + f.billedGross, 0);
  const totalCollected = fin.reduce((a, f) => a + f.collected, 0);
  const uncollected = totalBilled - totalCollected;
  const latest = fin[fin.length - 1];
  const activePct = latest && latest.vehiclesDelivered ? (latest.vehiclesActive ?? 0) / latest.vehiclesDelivered : null;

  // ---- driver conversion (Bolt) ----
  const sc: Record<string, number> = {};
  let offered = 0;
  for (const r of statusRows) {
    sc[r.orderStatus] = r._count._all;
    offered += r._count._all;
  }
  const finished = sc['finished'] ?? 0;
  const conversion = offered > 0 ? finished / offered : null;
  const outcomeLabels = ['Finished', 'No response', 'Rejected', 'Cancel (client)', 'Cancel (driver)', 'No-show'];
  const outcomeValues = [
    finished,
    sc['driver_did_not_respond'] ?? 0,
    sc['driver_rejected'] ?? 0,
    sc['client_cancelled'] ?? 0,
    sc['driver_cancelled_after_accept'] ?? 0,
    sc['client_did_not_show'] ?? 0,
  ];

  // ---- idle ACTIVE vehicles (no Bolt finished trips in window) ----
  const earning = new Set(prof.vehicles.map((v) => v.vehicleId));
  const idle = activeVehicles
    .filter((v) => !earning.has(v.id))
    .map((v) => ({ id: v.id, plate: v.licensePlate, vehicle: `${v.make} ${v.model}` }))
    .sort((a, b) => a.plate.localeCompare(b.plate));

  // ---- lowest-converting drivers (meaningful volume) ----
  const worstDrivers = driverPerf.drivers
    .filter((d) => d.offered >= 20 && d.acceptanceRate != null)
    .sort((a, b) => (a.acceptanceRate ?? 0) - (b.acceptanceRate ?? 0))
    .slice(0, 15)
    .map((d) => ({
      id: d.driverUuid,
      driver: d.driverName || d.driverUuid.slice(0, 8),
      offered: d.offered,
      finished: d.finished,
      acceptanceRate: d.acceptanceRate,
      completionRate: d.completionRate,
      grossRevenue: d.grossRevenue,
    }));

  const charts: ChartSpec[] = [
    {
      type: 'line',
      title: 'Fleet delivered vs active by month',
      description: 'The widening gap is idle capital — cars financed but not earning.',
      labels: months,
      series: [
        { name: 'Delivered', values: delivered, color: 'info' },
        { name: 'Active', values: active, color: 'success', dashed: true },
      ],
      valueFormat: 'int',
    },
    {
      type: 'bar',
      title: 'Collection rate by month',
      description: 'Falling collections track falling utilisation and driver earnings.',
      labels: months,
      series: [{ name: 'Collection %', values: collPct, color: 'warning' }],
      valueFormat: 'percent',
    },
    {
      type: 'line',
      title: 'Profit-fund balance',
      description: 'Residual profit after funding lease, insurance and fees. Deeply negative.',
      labels: months,
      series: [{ name: 'Profit fund', values: profitFund, color: 'danger' }],
      valueFormat: 'money',
    },
    {
      type: 'bar',
      title: 'Bolt offer outcomes (window)',
      description: 'Drivers ignore or reject most offers — the biggest hidden revenue lever.',
      labels: outcomeLabels,
      series: [{ name: 'Orders', values: outcomeValues, color: 'peri' }],
      valueFormat: 'int',
      highlightIndex: 0,
    },
  ];

  return {
    key: 'fleet-health',
    title: 'Fleet Health — Executive Dashboard',
    description: 'Utilisation, collections and driver conversion against the financial position — plus the vehicles and drivers to act on.',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      {
        label: 'Fleet active',
        value: activePct,
        format: 'percent',
        tone: activePct == null ? 'neutral' : activePct >= 0.9 ? 'success' : 'warning',
        sub: latest ? `${latest.vehiclesActive}/${latest.vehiclesDelivered}` : undefined,
      },
      {
        label: 'Latest collection',
        value: collPct[collPct.length - 1] ?? null,
        format: 'percent',
        tone: (collPct[collPct.length - 1] ?? 0) >= 0.9 ? 'success' : 'warning',
      },
      { label: 'Uncollected (cum.)', value: uncollected, format: 'money', tone: 'danger' },
      {
        label: 'Profit fund',
        value: latest?.profitFundBalance ?? null,
        format: 'money',
        tone: (latest?.profitFundBalance ?? 0) < 0 ? 'danger' : 'success',
      },
      {
        label: 'Driver conversion',
        value: conversion,
        format: 'percent',
        tone: conversion == null ? 'neutral' : conversion >= 0.5 ? 'success' : 'danger',
        sub: 'finished / offered',
      },
      { label: 'Idle active vehicles', value: idle.length, format: 'int', tone: idle.length ? 'warning' : 'success' },
    ],
    charts,
    sections: [
      {
        title: `Idle vehicles — ACTIVE but no Bolt earnings in window (${idle.length})`,
        description: 'Financed and insured but not producing. Recover, redeploy or off-hire.',
        tone: 'warning',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
        ],
        rows: idle,
        emptyMessage: 'Every active vehicle is earning. ✓',
      },
      {
        title: `Lowest-converting drivers (${worstDrivers.length})`,
        description: 'High offers, low acceptance — they earn little, so they can\'t pay rental. Coach or churn.',
        tone: 'danger',
        columns: [
          { key: 'driver', header: 'Driver' },
          { key: 'offered', header: 'Offered', format: 'int', align: 'right' },
          { key: 'finished', header: 'Finished', format: 'int', align: 'right' },
          { key: 'acceptanceRate', header: 'Accept', format: 'percent', align: 'right' },
          { key: 'completionRate', header: 'Complete', format: 'percent', align: 'right' },
          { key: 'grossRevenue', header: 'Gross', format: 'money', align: 'right' },
        ],
        rows: worstDrivers,
        emptyMessage: 'No drivers meet the minimum sample.',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
