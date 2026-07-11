import prisma from '../../config/database';
import { ReportParams, ReportResult } from './types';
import { resolveWindow } from './window';

/**
 * Cartrack-active but Bolt-silent — cars that ARE being driven (Cartrack trips /
 * movement) but produce no (or few) Bolt trips in the same period. These are
 * almost certainly being used privately and won't be earning rental for us.
 */
export async function cartrackNotBoltReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);

  const [fleetVehicles, vehicles, cartrackAgg, boltAgg] = await Promise.all([
    prisma.cartrackFleetVehicle.findMany({
      where: { cartrackVehicleId: { not: null }, isActive: true },
      select: { id: true, vehicleId: true, licensePlate: true },
    }),
    prisma.vehicle.findMany({ select: { id: true, make: true, model: true } }),
    prisma.cartrackTrip.groupBy({
      by: ['cartrackFleetVehicleId'],
      where: { startTime: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { distanceKm: true },
      _max: { endTime: true },
    }),
    prisma.boltTrip.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { not: null }, orderStatus: 'finished', orderCreatedAt: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { rideDistanceMeters: true },
    }),
  ]);

  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const cartrackByFv = new Map(cartrackAgg.map((c) => [c.cartrackFleetVehicleId, c]));
  const boltByVehicle = new Map(boltAgg.map((b) => [b.vehicleId as string, b]));

  interface Row {
    id: string;
    plate: string;
    vehicle: string;
    cartrackTrips: number;
    cartrackKm: number;
    boltTrips: number;
    boltKm: number;
    boltShare: number | null;
    lastMoved: string | null;
  }
  const moving: Row[] = [];
  for (const fv of fleetVehicles) {
    const ct = cartrackByFv.get(fv.id);
    const cartrackTrips = ct?._count._all ?? 0;
    if (cartrackTrips === 0) continue; // only cars that are actually moving on Cartrack
    const cartrackKm = ct?._sum.distanceKm ?? 0;
    const bolt = boltByVehicle.get(fv.vehicleId);
    const boltTrips = bolt?._count._all ?? 0;
    const boltKm = (bolt?._sum.rideDistanceMeters ?? 0) / 1000;
    const v = vById.get(fv.vehicleId);
    moving.push({
      id: fv.id,
      plate: fv.licensePlate,
      vehicle: v ? `${v.make} ${v.model}` : '—',
      cartrackTrips,
      cartrackKm: Math.round(cartrackKm),
      boltTrips,
      boltKm: Math.round(boltKm),
      boltShare: cartrackKm > 0 ? Math.min(1, boltKm / cartrackKm) : null,
      lastMoved: ct?._max.endTime?.toISOString() ?? null,
    });
  }

  const zeroBolt = moving
    .filter((r) => r.boltTrips === 0)
    .sort((a, b) => b.cartrackKm - a.cartrackKm);
  const mostlyPersonal = moving
    .filter((r) => r.boltTrips > 0 && (r.boltShare ?? 1) < 0.5)
    .sort((a, b) => (a.boltShare ?? 0) - (b.boltShare ?? 0));

  const wastedKm = zeroBolt.reduce((a, r) => a + r.cartrackKm, 0);

  const cols = [
    { key: 'plate', header: 'Plate' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'cartrackTrips', header: 'Cartrack trips', format: 'int' as const, align: 'right' as const },
    { key: 'cartrackKm', header: 'Cartrack km', format: 'km' as const, align: 'right' as const },
    { key: 'boltTrips', header: 'Bolt trips', format: 'int' as const, align: 'right' as const },
    { key: 'boltKm', header: 'Bolt km', format: 'km' as const, align: 'right' as const },
    { key: 'boltShare', header: 'Bolt share', format: 'percent' as const, align: 'right' as const },
    { key: 'lastMoved', header: 'Last moved', format: 'datetime' as const },
  ];

  return {
    key: 'cartrack-not-bolt',
    title: 'Private Use — Moving on Cartrack, Silent on Bolt',
    description:
      'Vehicles that are being driven (Cartrack movement) but generating no or minimal Bolt income — likely personal use and not paying rental.',
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      { label: 'Moving on Cartrack', value: moving.length, format: 'int' },
      {
        label: 'Zero Bolt trips',
        value: zeroBolt.length,
        format: 'int',
        tone: zeroBolt.length ? 'danger' : 'success',
      },
      { label: 'Km driven, no Bolt', value: wastedKm, format: 'km', tone: 'warning' },
      {
        label: 'Mostly-personal',
        value: mostlyPersonal.length,
        format: 'int',
        tone: mostlyPersonal.length ? 'warning' : 'success',
      },
    ],
    sections: [
      {
        title: `Moving on Cartrack, ZERO Bolt trips (${zeroBolt.length})`,
        description: 'Being driven but earning nothing on Bolt — chase the driver, these are not paying us back.',
        tone: 'danger',
        columns: cols,
        rows: zeroBolt,
        emptyMessage: 'Every moving vehicle is doing Bolt trips. ✓',
      },
      {
        title: `Predominantly personal — Bolt is under half the distance (${mostlyPersonal.length})`,
        description: 'Doing some Bolt work, but most kilometres are off-platform.',
        tone: 'warning',
        columns: cols,
        rows: mostlyPersonal,
        emptyMessage: 'No vehicles with a high private-use ratio. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
