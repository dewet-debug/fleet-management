import prisma from '../../config/database';
import { ReportResult } from './types';

const HOUR = 3600 * 1000;

/** "3d 4h" / "12h" from a duration in hours. */
function humanize(hours: number | null): string {
  if (hours == null) return '—';
  const h = Math.max(0, Math.round(hours));
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  const rem = h % 24;
  return rem ? `${d}d ${rem}h` : `${d}d`;
}

/**
 * Stationary vehicles — cars (per Cartrack) that have not made a trip in 24h+.
 * "Reference now" is the freshest telemetry in the fleet, so it's robust to sync
 * lag. Shows how long each car has been stationary; for cars with no trip in the
 * synced history we fall back to the last telemetry signal (device went dark) or
 * the window floor.
 */
export async function stationaryVehiclesReport(): Promise<ReportResult> {
  const [fleetVehicles, vehicles, vehicleData, lastTrips, tripSpan] = await Promise.all([
    prisma.cartrackFleetVehicle.findMany({
      where: { cartrackVehicleId: { not: null }, isActive: true },
      select: { id: true, vehicleId: true, licensePlate: true },
    }),
    prisma.vehicle.findMany({ select: { id: true, make: true, model: true, status: true } }),
    prisma.cartrackVehicleData.findMany({
      select: {
        cartrackFleetVehicleId: true,
        lastEventTime: true,
        lastLatitude: true,
        lastLongitude: true,
        odometer: true,
      },
    }),
    prisma.cartrackTrip.groupBy({ by: ['cartrackFleetVehicleId'], _max: { endTime: true } }),
    prisma.cartrackTrip.aggregate({ _min: { startTime: true } }),
  ]);

  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const vdByFv = new Map(vehicleData.map((d) => [d.cartrackFleetVehicleId, d]));
  const lastTripByFv = new Map(lastTrips.map((t) => [t.cartrackFleetVehicleId, t._max.endTime]));

  // reference "now" = freshest telemetry across the fleet (robust to sync lag)
  let refNow = 0;
  for (const d of vehicleData) if (d.lastEventTime) refNow = Math.max(refNow, d.lastEventTime.getTime());
  for (const t of lastTrips) if (t._max.endTime) refNow = Math.max(refNow, t._max.endTime.getTime());
  if (!refNow) refNow = Date.now();
  const windowStart = tripSpan._min.startTime?.getTime() ?? refNow;

  const rows = fleetVehicles.map((fv) => {
    const v = vById.get(fv.vehicleId);
    const vd = vdByFv.get(fv.id);
    const lastTrip = lastTripByFv.get(fv.id) ?? null;
    const lastEvent = vd?.lastEventTime ?? null;
    const hoursSinceSignal = lastEvent ? (refNow - lastEvent.getTime()) / HOUR : null;
    const offline = hoursSinceSignal == null || hoursSinceSignal >= 24;

    // Hours since the car last moved. If it made a trip in the window, that's
    // exact. If not, it has been parked at least since the window start — or,
    // if the tracker also went dark, since the last signal (a better estimate).
    let hoursStationary: number | null;
    let approx = false;
    if (lastTrip) {
      hoursStationary = (refNow - lastTrip.getTime()) / HOUR;
    } else if (offline && lastEvent) {
      hoursStationary = (refNow - lastEvent.getTime()) / HOUR; // device stopped reporting
    } else {
      hoursStationary = (refNow - windowStart) / HOUR; // parked at least the whole window
      approx = true;
    }
    const stationary = lastTrip == null || hoursStationary >= 24;

    return {
      id: fv.id,
      plate: fv.licensePlate,
      vehicle: v ? `${v.make} ${v.model}` : '—',
      status: v?.status ?? '—',
      lastMoved: lastTrip?.toISOString() ?? null,
      stationaryFor: (approx ? '≥ ' : '') + humanize(hoursStationary),
      hoursStationary: Math.round(hoursStationary),
      lastSignal: lastEvent?.toISOString() ?? null,
      device: offline ? 'No signal 24h+' : 'Online',
      position: vd?.lastLatitude != null ? `${vd.lastLatitude.toFixed(4)}, ${vd.lastLongitude?.toFixed(4)}` : '—',
      odometer: vd?.odometer ?? null,
      _stationary: stationary,
      _offline: offline,
    };
  });

  const movedRecently = rows.filter((r) => !r._stationary).length;
  const stationary = rows.filter((r) => r._stationary).sort((a, b) => b.hoursStationary - a.hoursStationary);
  const offline = rows.filter((r) => r._offline);
  const stationary72 = stationary.filter((r) => r.hoursStationary >= 72).length;

  const cols = [
    { key: 'plate', header: 'Plate' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'status', header: 'Status' },
    { key: 'stationaryFor', header: 'Stationary for' },
    { key: 'lastMoved', header: 'Last moved', format: 'datetime' as const },
    { key: 'device', header: 'Device' },
    { key: 'position', header: 'Last position' },
    { key: 'odometer', header: 'Odometer (km)', format: 'int' as const, align: 'right' as const },
  ];

  return {
    key: 'stationary-vehicles',
    title: 'Stationary Vehicles (24h+)',
    description:
      'Cars that have not made a Cartrack trip in 24h or more, and how long they have been stationary. "≥" means no trip in the synced history, so the true duration is at least that long.',
    window: null,
    kpis: [
      { label: 'Tracked vehicles', value: rows.length, format: 'int' },
      { label: 'Moved < 24h', value: movedRecently, format: 'int', tone: 'success' },
      {
        label: 'Stationary 24h+',
        value: stationary.length,
        format: 'int',
        tone: stationary.length ? 'warning' : 'success',
      },
      { label: 'Stationary 72h+', value: stationary72, format: 'int', tone: stationary72 ? 'danger' : 'success' },
      {
        label: 'Devices offline (24h+)',
        value: offline.length,
        format: 'int',
        tone: offline.length ? 'danger' : 'success',
      },
    ],
    sections: [
      {
        title: `Stationary 24h+ (${stationary.length})`,
        description: 'Longest-stationary first. Cross-check against impound / repair / repossession.',
        tone: 'warning',
        columns: cols,
        rows: stationary.map(({ _stationary, _offline, hoursStationary, lastSignal, ...r }) => r),
        emptyMessage: 'Every tracked vehicle moved in the last 24h. ✓',
      },
      {
        title: `Devices with no telemetry in 24h+ (${offline.length})`,
        description: 'Tracker has gone silent — off, out of coverage, battery/tamper, or vehicle missing.',
        tone: 'danger',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'status', header: 'Status' },
          { key: 'stationaryFor', header: 'Silent for' },
          { key: 'lastSignal', header: 'Last signal', format: 'datetime' as const },
          { key: 'position', header: 'Last position' },
        ],
        rows: offline
          .sort((a, b) => (a.lastSignal ?? '').localeCompare(b.lastSignal ?? ''))
          .map(({ _stationary, _offline, hoursStationary, ...r }) => r),
        emptyMessage: 'Every tracker is reporting. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
