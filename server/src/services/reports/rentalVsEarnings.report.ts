import prisma from '../../config/database';
import { ReportResult } from './types';

const norm = (p: string | null | undefined) => (p ?? '').toUpperCase().replace(/\s/g, '');

function nextMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Rental vs earnings — for the latest billed month, compares each vehicle's
 * rental billed against the driver's Bolt net earnings, to show exactly who
 * cannot cover their rental from the platform.
 */
export async function rentalVsEarningsReport(): Promise<ReportResult> {
  const latest = await prisma.vehicleRentalMonth.findFirst({ orderBy: { month: 'desc' }, select: { month: true } });
  const month = latest?.month ?? '2026-06';
  const start = new Date(`${month}-01T00:00:00+02:00`);
  const end = new Date(`${nextMonthKey(month)}-01T00:00:00+02:00`);

  const [rentals, boltAgg, vehicles] = await Promise.all([
    prisma.vehicleRentalMonth.findMany({ where: { month } }),
    prisma.boltTrip.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { not: null }, orderStatus: 'finished', orderCreatedAt: { gte: start, lt: end } },
      _sum: { netEarnings: true, ridePrice: true },
      _count: { _all: true },
    }),
    prisma.vehicle.findMany({ select: { id: true, licensePlate: true } }),
  ]);

  const plateById = new Map(vehicles.map((v) => [v.id, norm(v.licensePlate)]));
  const boltByPlate = new Map<string, { net: number; trips: number }>();
  for (const b of boltAgg) {
    const plate = plateById.get(b.vehicleId as string);
    if (!plate) continue;
    boltByPlate.set(plate, { net: b._sum.netEarnings ?? 0, trips: b._count._all });
  }

  const rows = rentals.map((r) => {
    const bolt = boltByPlate.get(norm(r.licensePlate));
    const net = bolt?.net ?? 0;
    const billed = r.rentalBilled;
    return {
      id: r.licensePlate,
      plate: r.licensePlate,
      driver: r.driverName ?? '—',
      rentalBilled: Math.round(billed),
      boltNet: Math.round(net),
      boltTrips: bolt?.trips ?? 0,
      coverage: billed > 0 ? net / billed : null,
      gap: Math.round(billed - net),
    };
  });

  const noEarnings = rows.filter((r) => r.boltNet <= 0).sort((a, b) => b.rentalBilled - a.rentalBilled);
  const cantCover = rows
    .filter((r) => r.boltNet > 0 && r.boltNet < r.rentalBilled)
    .sort((a, b) => b.gap - a.gap);
  const healthy = rows.filter((r) => r.boltNet >= r.rentalBilled).length;
  const earners = rows.filter((r) => r.boltNet > 0);
  const avgCoverage = earners.length ? earners.reduce((a, r) => a + (r.coverage ?? 0), 0) / earners.length : null;
  const earningsGap = [...cantCover, ...noEarnings].reduce((a, r) => a + Math.max(0, r.gap), 0);

  const cols = [
    { key: 'plate', header: 'Plate' },
    { key: 'driver', header: 'Driver' },
    { key: 'rentalBilled', header: 'Rental billed', format: 'money' as const, align: 'right' as const },
    { key: 'boltNet', header: 'Bolt net', format: 'money' as const, align: 'right' as const },
    { key: 'boltTrips', header: 'Bolt trips', format: 'int' as const, align: 'right' as const },
    { key: 'coverage', header: 'Coverage', format: 'percent' as const, align: 'right' as const },
    { key: 'gap', header: 'Shortfall', format: 'money' as const, align: 'right' as const },
  ];
  const mLabel = (() => {
    const [y, m] = month.split('-');
    return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m]} ${y}`;
  })();

  return {
    key: 'rental-vs-earnings',
    title: 'Rental vs Earnings — Can Drivers Cover Rental?',
    description: `${mLabel}: each vehicle's rental billed vs the driver's Bolt net earnings. Rental billed can include arrears, so coverage <100% may reflect accumulated debt.`,
    window: { from: start.toISOString(), to: end.toISOString() },
    kpis: [
      { label: 'Vehicles billed', value: rows.length, format: 'int' },
      { label: 'Cover rental ✓', value: healthy, format: 'int', tone: 'success' },
      { label: "Can't cover", value: cantCover.length, format: 'int', tone: cantCover.length ? 'warning' : 'success' },
      { label: 'No Bolt income', value: noEarnings.length, format: 'int', tone: noEarnings.length ? 'danger' : 'success' },
      { label: 'Avg coverage (earners)', value: avgCoverage, format: 'percent' },
    ],
    sections: [
      {
        title: `No Bolt income — rental billed, zero Bolt earnings (${noEarnings.length})`,
        description: 'Billed rental but earned nothing on Bolt this month — cannot pay from the platform. Cross-check private-use / idle reports.',
        tone: 'danger',
        columns: cols,
        rows: noEarnings,
        emptyMessage: 'Every billed vehicle earned on Bolt. ✓',
      },
      {
        title: `Earning but can't cover rental (${cantCover.length})`,
        description: 'Working on Bolt but net earnings fall short of rental billed — ranked by shortfall.',
        tone: 'warning',
        columns: cols,
        rows: cantCover,
        emptyMessage: 'Every earning driver covers their rental. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
