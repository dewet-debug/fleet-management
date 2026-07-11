import prisma from '../../config/database';
import { ReportResult, normalizePlate } from './types';

/**
 * Integration coverage & discrepancies across the three vehicle sources:
 *   - the app Vehicle registry (source of truth),
 *   - Bolt (any vehicle that has produced Bolt trips), and
 *   - Cartrack (vehicles enrolled AND matched to a Cartrack unit).
 *
 * Plates are normalized (uppercase, spaces stripped) before comparison because
 * Bolt matches on the raw plate while Cartrack matches on a normalized one.
 */
export async function integrationCoverageReport(): Promise<ReportResult> {
  const [vehicles, boltPlates, cartrackVehicles] = await Promise.all([
    prisma.vehicle.findMany({
      select: { id: true, licensePlate: true, make: true, model: true, status: true },
    }),
    prisma.boltTrip.groupBy({
      by: ['vehicleLicensePlate'],
      _count: { _all: true },
    }),
    prisma.cartrackFleetVehicle.findMany({
      where: { isActive: true },
      select: { licensePlate: true, cartrackVehicleId: true, syncStatus: true },
    }),
  ]);

  // registry: normalized plate -> vehicle
  const registry = new Map<string, (typeof vehicles)[number]>();
  for (const v of vehicles) registry.set(normalizePlate(v.licensePlate), v);

  // bolt: normalized plate -> trip count
  const bolt = new Map<string, number>();
  for (const b of boltPlates) {
    const p = normalizePlate(b.vehicleLicensePlate);
    if (p) bolt.set(p, (bolt.get(p) ?? 0) + b._count._all);
  }

  // cartrack: normalized plate -> matched? (cartrackVehicleId present => actually tracking)
  const cartrack = new Map<string, boolean>();
  for (const c of cartrackVehicles) {
    const p = normalizePlate(c.licensePlate);
    if (p) cartrack.set(p, cartrack.get(p) || c.cartrackVehicleId != null);
  }
  const cartrackMatched = new Set([...cartrack.entries()].filter(([, ok]) => ok).map(([p]) => p));

  const desc = (plate: string) => {
    const v = registry.get(plate);
    return v ? `${v.make} ${v.model}` : '—';
  };

  // On Bolt but not tracked by Cartrack
  const boltNotCartrack = [...bolt.keys()]
    .filter((p) => !cartrackMatched.has(p))
    .map((p) => ({
      plate: p,
      vehicle: desc(p),
      inRegistry: registry.has(p) ? 'Yes' : 'No',
      boltTrips: bolt.get(p) ?? 0,
    }))
    .sort((a, b) => b.boltTrips - a.boltTrips);

  // Tracked by Cartrack but no Bolt activity
  const cartrackNotBolt = [...cartrackMatched]
    .filter((p) => !bolt.has(p))
    .map((p) => ({ plate: p, vehicle: desc(p), inRegistry: registry.has(p) ? 'Yes' : 'No' }))
    .sort((a, b) => a.plate.localeCompare(b.plate));

  // In the registry but on neither integration
  const onNeither = [...registry.keys()]
    .filter((p) => !bolt.has(p) && !cartrackMatched.has(p))
    .map((p) => {
      const v = registry.get(p)!;
      return { plate: v.licensePlate, vehicle: `${v.make} ${v.model}`, status: v.status };
    })
    .sort((a, b) => a.plate.localeCompare(b.plate));

  // On Bolt but missing from the registry entirely (data-quality gap)
  const boltNotRegistry = [...bolt.keys()]
    .filter((p) => !registry.has(p))
    .map((p) => ({ plate: p, boltTrips: bolt.get(p) ?? 0 }))
    .sort((a, b) => b.boltTrips - a.boltTrips);

  const onBoth = [...bolt.keys()].filter((p) => cartrackMatched.has(p)).length;

  return {
    key: 'integration-coverage',
    title: 'Integration Coverage & Discrepancies',
    description:
      'Cross-check of vehicles across the registry, Bolt and Cartrack — surfaces cars tracked in one system but missing from another.',
    window: null,
    kpis: [
      { label: 'Registry vehicles', value: vehicles.length, format: 'int' },
      { label: 'Active on Bolt', value: bolt.size, format: 'int' },
      { label: 'Tracked by Cartrack', value: cartrackMatched.size, format: 'int' },
      { label: 'On both Bolt & Cartrack', value: onBoth, format: 'int', tone: 'success' },
      {
        label: 'Discrepancies',
        value: boltNotCartrack.length + cartrackNotBolt.length + boltNotRegistry.length,
        format: 'int',
        tone:
          boltNotCartrack.length + cartrackNotBolt.length + boltNotRegistry.length > 0
            ? 'warning'
            : 'success',
      },
    ],
    sections: [
      {
        title: `On Bolt but not tracked by Cartrack (${boltNotCartrack.length})`,
        description: 'Earning on Bolt but not enrolled/matched in Cartrack — no telematics coverage.',
        tone: 'warning',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'inRegistry', header: 'In registry' },
          { key: 'boltTrips', header: 'Bolt trips', format: 'int', align: 'right' },
        ],
        rows: boltNotCartrack,
        emptyMessage: 'Every Bolt vehicle is tracked by Cartrack. ✓',
      },
      {
        title: `Tracked by Cartrack but no Bolt activity (${cartrackNotBolt.length})`,
        description: 'Has telematics but no Bolt earnings in any period — idle, off-platform, or plate mismatch.',
        tone: 'info',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'inRegistry', header: 'In registry' },
        ],
        rows: cartrackNotBolt,
        emptyMessage: 'Every Cartrack vehicle has Bolt activity. ✓',
      },
      {
        title: `In registry but on neither integration (${onNeither.length})`,
        description: 'Registered vehicles with no Bolt and no Cartrack presence.',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'status', header: 'Status' },
        ],
        rows: onNeither,
        emptyMessage: 'Every registered vehicle is on at least one integration. ✓',
      },
      {
        title: `On Bolt but missing from the registry (${boltNotRegistry.length})`,
        description: 'Bolt trips for plates that do not exist in the vehicle registry — add them to reconcile.',
        tone: 'danger',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'boltTrips', header: 'Bolt trips', format: 'int', align: 'right' },
        ],
        rows: boltNotRegistry,
        emptyMessage: 'Every Bolt plate exists in the registry. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
