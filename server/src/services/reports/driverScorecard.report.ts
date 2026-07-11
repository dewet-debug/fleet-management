import prisma from '../../config/database';
import { ReportResult } from './types';

const HOUR = 3600 * 1000;
const SHORT = 0.9;
const norm = (p: string | null | undefined) => (p ?? '').toUpperCase().replace(/\s/g, '');
const nextMonthKey = (m: string) => {
  const [y, mm] = m.split('-').map(Number);
  return mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, '0')}`;
};

/**
 * Per-driver scorecard — one ranked call-list. For the latest billed month it
 * joins rental owed, months-behind history, Bolt net earnings and the Cartrack
 * behaviour flags (no-Bolt / private-use / stationary) so collections has a
 * single prioritised action list of exactly who to chase and why.
 */
export async function driverScorecardReport(): Promise<ReportResult> {
  const latest = await prisma.vehicleRentalMonth.findFirst({ orderBy: { month: 'desc' }, select: { month: true } });
  const month = latest?.month ?? '2026-06';
  const start = new Date(`${month}-01T00:00:00+02:00`);
  const end = new Date(`${nextMonthKey(month)}-01T00:00:00+02:00`);

  const [rentals, allRentals, boltAgg, cartrackAgg, fleetVehicles, vehicles] = await Promise.all([
    prisma.vehicleRentalMonth.findMany({ where: { month } }),
    prisma.vehicleRentalMonth.findMany({ select: { licensePlate: true, rentalBilled: true, rentalCollected: true } }),
    prisma.boltTrip.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { not: null }, orderStatus: 'finished', orderCreatedAt: { gte: start, lt: end } },
      _sum: { netEarnings: true },
      _count: { _all: true },
    }),
    prisma.cartrackTrip.groupBy({ by: ['cartrackFleetVehicleId'], _count: { _all: true }, _max: { endTime: true } }),
    prisma.cartrackFleetVehicle.findMany({ where: { cartrackVehicleId: { not: null } }, select: { id: true, vehicleId: true } }),
    prisma.vehicle.findMany({ select: { id: true, licensePlate: true } }),
  ]);

  const plateById = new Map(vehicles.map((v) => [v.id, norm(v.licensePlate)]));
  const boltByPlate = new Map<string, { net: number; trips: number }>();
  for (const b of boltAgg) {
    const p = plateById.get(b.vehicleId as string);
    if (p) boltByPlate.set(p, { net: b._sum.netEarnings ?? 0, trips: b._count._all });
  }
  // cartrack recent activity by plate
  const fvToVehicle = new Map(fleetVehicles.map((f) => [f.id, f.vehicleId]));
  const cartrackByPlate = new Map<string, { trips: number; lastEnd: number | null }>();
  let refNow = 0;
  for (const c of cartrackAgg) {
    const vid = fvToVehicle.get(c.cartrackFleetVehicleId);
    const plate = vid ? plateById.get(vid) : null;
    const end = c._max.endTime?.getTime() ?? null;
    if (end) refNow = Math.max(refNow, end);
    if (plate) cartrackByPlate.set(plate, { trips: c._count._all, lastEnd: end });
  }
  if (!refNow) refNow = Date.now();

  // months-behind by plate (all history)
  const behind = new Map<string, number>();
  for (const r of allRentals) {
    if (r.rentalCollected < r.rentalBilled * SHORT) {
      behind.set(norm(r.licensePlate), (behind.get(norm(r.licensePlate)) ?? 0) + 1);
    }
  }

  const rows = rentals.map((r) => {
    const plate = norm(r.licensePlate);
    const bolt = boltByPlate.get(plate);
    const ct = cartrackByPlate.get(plate);
    const boltNet = bolt?.net ?? 0;
    const boltTrips = bolt?.trips ?? 0;
    const owed = r.rentalBilled - r.rentalCollected;
    const monthsBehind = behind.get(plate) ?? 0;
    const noBolt = boltTrips === 0;
    const movingOnCartrack = (ct?.trips ?? 0) > 0;
    const privateUse = movingOnCartrack && noBolt;
    const stationary = ct?.lastEnd == null || (refNow - ct.lastEnd) / HOUR >= 24;

    const flags: string[] = [];
    if (privateUse) flags.push('Private use');
    else if (noBolt) flags.push('No Bolt');
    if (stationary) flags.push('Stationary');
    if (monthsBehind >= 3) flags.push(`Behind ${monthsBehind}mo`);

    // risk score: rental owed, weighted up by red flags
    const risk = Math.max(0, owed) * (1 + (privateUse ? 1 : 0) + (monthsBehind >= 3 ? 1 : 0));

    return {
      id: r.licensePlate,
      driver: r.driverName ?? '—',
      plate: r.licensePlate,
      rentalBilled: Math.round(r.rentalBilled),
      collected: Math.round(r.rentalCollected),
      owed: Math.round(owed),
      monthsBehind,
      boltNet: Math.round(boltNet),
      boltTrips,
      coverage: r.rentalBilled > 0 ? boltNet / r.rentalBilled : null,
      flags: flags.join(' · ') || '—',
      risk,
    };
  });

  rows.sort((a, b) => b.risk - a.risk || b.owed - a.owed);

  const atRisk = rows.filter((r) => r.owed > 0);
  const privateCount = rows.filter((r) => r.flags.includes('Private use')).length;
  const noBoltCount = rows.filter((r) => r.flags.includes('No Bolt') || r.flags.includes('Private use')).length;
  const totalOwed = rows.reduce((a, r) => a + Math.max(0, r.owed), 0);

  const cols = [
    { key: 'driver', header: 'Driver' },
    { key: 'plate', header: 'Plate' },
    { key: 'owed', header: 'Owed', format: 'money' as const, align: 'right' as const },
    { key: 'monthsBehind', header: 'Mo behind', format: 'int' as const, align: 'right' as const },
    { key: 'rentalBilled', header: 'Billed', format: 'money' as const, align: 'right' as const },
    { key: 'boltNet', header: 'Bolt net', format: 'money' as const, align: 'right' as const },
    { key: 'boltTrips', header: 'Bolt trips', format: 'int' as const, align: 'right' as const },
    { key: 'coverage', header: 'Coverage', format: 'percent' as const, align: 'right' as const },
    { key: 'flags', header: 'Flags' },
  ];

  const stripRisk = (r: any) => {
    const { risk, ...rest } = r;
    return rest;
  };

  return {
    key: 'driver-scorecard',
    title: 'Driver Scorecard — Collections Call-List',
    description: `${month}: every driver ranked by rental at risk, with months-behind, Bolt earnings and behaviour flags. Rental billed can include arrears.`,
    window: { from: start.toISOString(), to: end.toISOString() },
    kpis: [
      { label: 'Drivers', value: rows.length, format: 'int' },
      { label: 'Rental owed (month)', value: totalOwed, format: 'money', tone: 'danger' },
      { label: 'At risk (owing)', value: atRisk.length, format: 'int', tone: atRisk.length ? 'warning' : 'success' },
      { label: 'No Bolt income', value: noBoltCount, format: 'int', tone: noBoltCount ? 'danger' : 'success' },
      { label: 'Private use', value: privateCount, format: 'int', tone: privateCount ? 'danger' : 'success' },
    ],
    sections: [
      {
        title: `Priority call-list — ranked by rental at risk (${rows.length})`,
        description: 'Highest risk first (rental owed, weighted up for private-use and chronic arrears). Work top-down.',
        tone: 'danger',
        columns: cols,
        rows: rows.map(stripRisk),
        emptyMessage: 'No driver rental records for this month.',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
