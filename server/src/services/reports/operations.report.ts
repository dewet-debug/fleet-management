import prisma from '../../config/database';
import { getVehicleProfitability } from '../analytics/profitability.service';
import { ReportParams, ReportResult } from './types';
import { resolveWindow, DAY_MS } from './window';

// ---- Fleet utilisation ----

export async function fleetUtilisationReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);

  const [prof, vehicles, cartrackTripAgg, fleetVehicles] = await Promise.all([
    getVehicleProfitability(params),
    prisma.vehicle.findMany({
      select: { id: true, licensePlate: true, make: true, model: true, status: true },
    }),
    prisma.cartrackTrip.groupBy({
      by: ['cartrackFleetVehicleId'],
      where: { startTime: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { distanceKm: true },
    }),
    prisma.cartrackFleetVehicle.findMany({ select: { id: true, vehicleId: true } }),
  ]);

  const profById = new Map(prof.vehicles.map((v) => [v.vehicleId, v]));
  const fleetVehicleToVehicle = new Map(fleetVehicles.map((f) => [f.id, f.vehicleId]));
  const cartrackByVehicle = new Map<string, { trips: number; km: number }>();
  for (const t of cartrackTripAgg) {
    const vid = fleetVehicleToVehicle.get(t.cartrackFleetVehicleId);
    if (!vid) continue;
    cartrackByVehicle.set(vid, { trips: t._count._all, km: t._sum.distanceKm ?? 0 });
  }

  const rows = vehicles.map((v) => {
    const p = profById.get(v.id);
    const ct = cartrackByVehicle.get(v.id);
    const boltTrips = p?.finishedTrips ?? 0;
    const cartrackTrips = ct?.trips ?? 0;
    return {
      id: v.id,
      plate: v.licensePlate,
      vehicle: `${v.make} ${v.model}`,
      status: v.status,
      boltTrips,
      activeDays: p?.activeDays ?? 0,
      utilisation: p?.utilisation ?? 0,
      cartrackTrips,
      cartrackKm: ct?.km ?? 0,
      idle: boltTrips === 0 && cartrackTrips === 0,
    };
  });

  const idle = rows.filter((r) => r.idle && r.status === 'ACTIVE').sort((a, b) => a.plate.localeCompare(b.plate));
  const active = rows.filter((r) => !r.idle).sort((a, b) => (b.utilisation ?? 0) - (a.utilisation ?? 0));
  const avgActiveDays = active.length ? active.reduce((s, r) => s + r.activeDays, 0) / active.length : 0;

  const utilCols = [
    { key: 'plate', header: 'Plate' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'boltTrips', header: 'Bolt trips', format: 'int' as const, align: 'right' as const },
    { key: 'activeDays', header: 'Active days', format: 'int' as const, align: 'right' as const },
    { key: 'utilisation', header: 'Utilisation', format: 'percent' as const, align: 'right' as const },
    { key: 'cartrackTrips', header: 'Cartrack trips', format: 'int' as const, align: 'right' as const },
    { key: 'cartrackKm', header: 'Cartrack km', format: 'km' as const, align: 'right' as const },
  ];

  return {
    key: 'fleet-utilisation',
    title: 'Fleet Utilisation',
    description: 'Active vs idle vehicles across Bolt and Cartrack activity in the selected window.',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      { label: 'Registry vehicles', value: vehicles.length, format: 'int' },
      { label: 'Active in window', value: active.length, format: 'int', tone: 'success' },
      {
        label: 'Idle (active status)',
        value: idle.length,
        format: 'int',
        tone: idle.length > 0 ? 'warning' : 'success',
      },
      { label: 'Avg active days', value: Math.round(avgActiveDays * 10) / 10, format: 'number' },
    ],
    sections: [
      {
        title: `Idle vehicles — no Bolt or Cartrack activity (${idle.length})`,
        description: 'Vehicles flagged ACTIVE but with no trips on either integration in this window.',
        tone: 'warning',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'status', header: 'Status' },
        ],
        rows: idle,
        emptyMessage: 'No idle active vehicles. ✓',
      },
      {
        title: `Utilisation by vehicle (${active.length})`,
        columns: utilCols,
        rows: active,
        emptyMessage: 'No vehicle activity in this window.',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ---- Service / maintenance due ----

export async function serviceDueReport(params: ReportParams): Promise<ReportResult> {
  const horizonDays = Math.min(365, Math.max(7, params.horizonDays ?? 30));
  const now = Date.now();

  const intervals = await prisma.vehicleServiceInterval.findMany({
    where: { OR: [{ nextServiceDate: { not: null } }, { nextServiceKilometers: { not: null } }] },
    select: {
      nextServiceDate: true,
      nextServiceKilometers: true,
      vehicle: { select: { id: true, licensePlate: true, make: true, model: true, currentKilometers: true } },
      serviceIntervalConfig: { select: { serviceType: { select: { name: true } } } },
    },
  });

  const KM_SOON = 1000; // flag as "due soon" when within 1000 km
  const mapped = intervals.map((iv) => {
    const daysUntil =
      iv.nextServiceDate != null ? Math.floor((iv.nextServiceDate.getTime() - now) / DAY_MS) : null;
    const kmUntil =
      iv.nextServiceKilometers != null ? iv.nextServiceKilometers - iv.vehicle.currentKilometers : null;
    const overdue = (daysUntil != null && daysUntil < 0) || (kmUntil != null && kmUntil < 0);
    const dueSoon =
      !overdue &&
      ((daysUntil != null && daysUntil <= horizonDays) || (kmUntil != null && kmUntil <= KM_SOON));
    return {
      id: `${iv.vehicle.id}-${iv.serviceIntervalConfig?.serviceType?.name ?? ''}`,
      plate: iv.vehicle.licensePlate,
      vehicle: `${iv.vehicle.make} ${iv.vehicle.model}`,
      serviceType: iv.serviceIntervalConfig?.serviceType?.name ?? '—',
      nextServiceDate: iv.nextServiceDate?.toISOString() ?? null,
      daysUntil,
      currentKm: iv.vehicle.currentKilometers,
      nextServiceKm: iv.nextServiceKilometers,
      kmUntil,
      overdue,
      dueSoon,
    };
  });

  const cols = [
    { key: 'plate', header: 'Plate' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'serviceType', header: 'Service' },
    { key: 'nextServiceDate', header: 'Next due', format: 'date' as const },
    { key: 'daysUntil', header: 'Days', format: 'days' as const, align: 'right' as const },
    { key: 'currentKm', header: 'Current km', format: 'int' as const, align: 'right' as const },
    { key: 'nextServiceKm', header: 'Due at km', format: 'int' as const, align: 'right' as const },
    { key: 'kmUntil', header: 'km left', format: 'int' as const, align: 'right' as const },
  ];

  const overdue = mapped.filter((m) => m.overdue).sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));
  const dueSoon = mapped.filter((m) => m.dueSoon).sort((a, b) => (a.daysUntil ?? 1e9) - (b.daysUntil ?? 1e9));

  return {
    key: 'service-due',
    title: 'Maintenance & Service Due',
    description: `Vehicles overdue or due for service within ${horizonDays} days / ${KM_SOON} km.`,
    window: null,
    kpis: [
      { label: 'Tracked schedules', value: mapped.length, format: 'int' },
      { label: 'Overdue', value: overdue.length, format: 'int', tone: overdue.length ? 'danger' : 'success' },
      { label: 'Due soon', value: dueSoon.length, format: 'int', tone: dueSoon.length ? 'warning' : 'success' },
    ],
    sections: [
      {
        title: `Overdue (${overdue.length})`,
        tone: 'danger',
        columns: cols,
        rows: overdue,
        emptyMessage: 'Nothing overdue. ✓',
      },
      {
        title: `Due soon (${dueSoon.length})`,
        tone: 'warning',
        columns: cols,
        rows: dueSoon,
        emptyMessage: 'Nothing due within the horizon. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ---- Compliance & expiries ----

export async function complianceExpiryReport(params: ReportParams): Promise<ReportResult> {
  const horizonDays = Math.min(365, Math.max(14, params.horizonDays ?? 60));
  const now = Date.now();
  const horizonMs = now + horizonDays * DAY_MS;

  const [vehicles, drivers, reminders] = await Promise.all([
    prisma.vehicle.findMany({
      select: {
        licensePlate: true,
        make: true,
        model: true,
        registrationExpiry: true,
        policyExpiryDate: true,
        warrantyExpiry: true,
        leaseEndDate: true,
      },
    }),
    prisma.driver.findMany({
      select: { firstName: true, lastName: true, licenseNumber: true, licenseExpiry: true, status: true },
    }),
    prisma.cartrackReminder.findMany({
      where: { dueDate: { not: null } },
      select: { registrationNumber: true, reminderType: true, title: true, dueDate: true },
    }),
  ]);

  type Row = { id: string; type: string; entity: string; dueDate: string; daysUntil: number };
  const rows: Row[] = [];
  const add = (type: string, entity: string, due: Date | null, idSuffix: string) => {
    if (!due) return;
    if (due.getTime() > horizonMs) return; // only expired or within horizon
    rows.push({
      id: `${type}-${idSuffix}`,
      type,
      entity,
      dueDate: due.toISOString(),
      daysUntil: Math.floor((due.getTime() - now) / DAY_MS),
    });
  };

  for (const v of vehicles) {
    const label = `${v.licensePlate} · ${v.make} ${v.model}`;
    add('Vehicle registration', label, v.registrationExpiry, `${v.licensePlate}-reg`);
    add('Insurance policy', label, v.policyExpiryDate, `${v.licensePlate}-ins`);
    add('Warranty', label, v.warrantyExpiry, `${v.licensePlate}-war`);
    add('Lease agreement', label, v.leaseEndDate, `${v.licensePlate}-lease`);
  }
  for (const d of drivers) {
    if (d.status !== 'ACTIVE') continue;
    add('Driver licence', `${d.firstName} ${d.lastName}`, d.licenseExpiry, `${d.licenseNumber}`);
  }
  for (const r of reminders) {
    add(
      `Cartrack: ${r.reminderType ?? r.title ?? 'reminder'}`,
      r.registrationNumber ?? '—',
      r.dueDate,
      `${r.registrationNumber ?? 'x'}-${r.dueDate?.getTime()}`,
    );
  }

  const expired = rows.filter((r) => r.daysUntil < 0).sort((a, b) => a.daysUntil - b.daysUntil);
  const upcoming = rows.filter((r) => r.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil);

  const cols = [
    { key: 'type', header: 'Type' },
    { key: 'entity', header: 'Vehicle / Driver' },
    { key: 'dueDate', header: 'Due', format: 'date' as const },
    { key: 'daysUntil', header: 'Days', format: 'days' as const, align: 'right' as const },
  ];

  return {
    key: 'compliance-expiry',
    title: 'Compliance & Expiries',
    description: `Registration, insurance, warranty, lease, driver licences and Cartrack reminders — expired or due within ${horizonDays} days.`,
    window: null,
    kpis: [
      { label: 'Expired', value: expired.length, format: 'int', tone: expired.length ? 'danger' : 'success' },
      {
        label: `Due ≤ ${horizonDays}d`,
        value: upcoming.length,
        format: 'int',
        tone: upcoming.length ? 'warning' : 'success',
      },
      { label: 'Items tracked', value: rows.length, format: 'int' },
    ],
    sections: [
      {
        title: `Expired (${expired.length})`,
        tone: 'danger',
        columns: cols,
        rows: expired,
        emptyMessage: 'Nothing expired. ✓',
      },
      {
        title: `Due within ${horizonDays} days (${upcoming.length})`,
        tone: 'warning',
        columns: cols,
        rows: upcoming,
        emptyMessage: 'Nothing due within the horizon. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ---- Driver safety / behaviour ----

export async function driverSafetyReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);

  const [coaching, alertAgg, fleetVehicles, vehicles] = await Promise.all([
    prisma.cartrackCoachingEvent.findMany({
      where: { eventTime: { gte: start, lte: end } },
      select: { driverName: true, eventType: true, score: true },
    }),
    prisma.cartrackAlert.groupBy({
      by: ['cartrackFleetVehicleId', 'severity'],
      where: { eventTime: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    prisma.cartrackFleetVehicle.findMany({ select: { id: true, vehicleId: true, licensePlate: true } }),
    prisma.vehicle.findMany({ select: { id: true, make: true, model: true } }),
  ]);

  // Coaching grouped by driver
  const byDriver = new Map<string, { events: number; scoreSum: number; scoreN: number }>();
  for (const c of coaching) {
    const name = c.driverName || 'Unknown';
    const b = byDriver.get(name) ?? { events: 0, scoreSum: 0, scoreN: 0 };
    b.events += 1;
    if (c.score != null) {
      b.scoreSum += c.score;
      b.scoreN += 1;
    }
    byDriver.set(name, b);
  }
  const coachingRows = [...byDriver.entries()]
    .map(([driver, b]) => ({
      id: driver,
      driver,
      events: b.events,
      avgScore: b.scoreN > 0 ? b.scoreSum / b.scoreN : null,
    }))
    .sort((a, b) => b.events - a.events);

  // Alerts grouped by vehicle
  const vMake = new Map(vehicles.map((v) => [v.id, v]));
  const fvInfo = new Map(fleetVehicles.map((f) => [f.id, f]));
  const alertByVehicle = new Map<string, { plate: string; vehicle: string; alerts: number }>();
  let totalAlerts = 0;
  for (const a of alertAgg) {
    totalAlerts += a._count._all;
    const fv = a.cartrackFleetVehicleId ? fvInfo.get(a.cartrackFleetVehicleId) : null;
    const key = fv?.id ?? 'unknown';
    const v = fv?.vehicleId ? vMake.get(fv.vehicleId) : null;
    const cur =
      alertByVehicle.get(key) ??
      { plate: fv?.licensePlate ?? '—', vehicle: v ? `${v.make} ${v.model}` : '—', alerts: 0 };
    cur.alerts += a._count._all;
    alertByVehicle.set(key, cur);
  }
  const alertRows = [...alertByVehicle.values()]
    .map((r, i) => ({ id: `${r.plate}-${i}`, ...r }))
    .sort((a, b) => b.alerts - a.alerts);

  return {
    key: 'driver-safety',
    title: 'Driver Safety & Behaviour',
    description: 'Cartrack coaching events and vehicle alerts in the selected window.',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      { label: 'Coaching events', value: coaching.length, format: 'int' },
      { label: 'Drivers flagged', value: coachingRows.length, format: 'int' },
      { label: 'Vehicle alerts', value: totalAlerts, format: 'int', tone: totalAlerts ? 'warning' : 'success' },
    ],
    sections: [
      {
        title: `Driver behaviour — coaching events (${coachingRows.length})`,
        description: 'Most-flagged drivers first. Avg score shown where Cartrack provides it.',
        columns: [
          { key: 'driver', header: 'Driver' },
          { key: 'events', header: 'Events', format: 'int', align: 'right' },
          { key: 'avgScore', header: 'Avg score', format: 'number', align: 'right' },
        ],
        rows: coachingRows,
        emptyMessage: 'No coaching events in this window (or Cartrack coaching not enabled).',
      },
      {
        title: `Vehicles by alert volume (${alertRows.length})`,
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'alerts', header: 'Alerts', format: 'int', align: 'right' },
        ],
        rows: alertRows,
        emptyMessage: 'No alerts in this window. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
