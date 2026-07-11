import prisma from '../../config/database';
import { ReportParams, ReportResult } from './types';
import { resolveWindow } from './window';

/**
 * Driving-behaviour proxy derived from Cartrack trip telemetry. This stands in
 * for the (currently empty) Cartrack coaching/alerts feed: every trip carries a
 * recorded max speed, so we flag speeding and excessive idling at the VEHICLE
 * level. It cannot attribute to drivers because Cartrack trips on this account
 * carry no driver identification.
 */
export async function drivingBehaviourReport(params: ReportParams): Promise<ReportResult> {
  const { start, end, windowDays } = resolveWindow(params);
  const limit = Math.min(200, Math.max(60, params.speedLimit ?? 120)); // SA highway default
  const severe = limit + 20;

  const [trips, fleetVehicles, vehicles] = await Promise.all([
    prisma.cartrackTrip.findMany({
      where: { startTime: { gte: start, lte: end }, maxSpeed: { not: null } },
      select: {
        maxSpeed: true,
        idlingDurationMinutes: true,
        distanceKm: true,
        durationMinutes: true,
        startTime: true,
        cartrackFleetVehicleId: true,
      },
    }),
    prisma.cartrackFleetVehicle.findMany({ select: { id: true, vehicleId: true, licensePlate: true } }),
    prisma.vehicle.findMany({ select: { id: true, make: true, model: true } }),
  ]);

  const fvById = new Map(fleetVehicles.map((f) => [f.id, f]));
  const vById = new Map(vehicles.map((v) => [v.id, v]));
  const label = (fvId: string | null) => {
    const fv = fvId ? fvById.get(fvId) : null;
    const v = fv?.vehicleId ? vById.get(fv.vehicleId) : null;
    return { plate: fv?.licensePlate ?? '—', vehicle: v ? `${v.make} ${v.model}` : '—' };
  };

  interface Agg {
    plate: string;
    vehicle: string;
    trips: number;
    speeding: number;
    severe: number;
    topSpeed: number;
    idleMinutes: number;
  }
  const byVehicle = new Map<string, Agg>();
  const incidents: Record<string, any>[] = [];
  let totalSpeeding = 0;
  let topSpeedOverall = 0;

  for (const t of trips) {
    const key = t.cartrackFleetVehicleId ?? 'unknown';
    const { plate, vehicle } = label(t.cartrackFleetVehicleId);
    let a = byVehicle.get(key);
    if (!a) {
      a = { plate, vehicle, trips: 0, speeding: 0, severe: 0, topSpeed: 0, idleMinutes: 0 };
      byVehicle.set(key, a);
    }
    a.trips += 1;
    a.idleMinutes += t.idlingDurationMinutes ?? 0;
    const ms = t.maxSpeed ?? 0;
    if (ms > a.topSpeed) a.topSpeed = ms;
    if (ms > topSpeedOverall) topSpeedOverall = ms;
    if (ms >= limit) {
      a.speeding += 1;
      totalSpeeding += 1;
      incidents.push({
        id: `${key}-${t.startTime?.getTime()}`,
        plate,
        vehicle,
        startTime: t.startTime?.toISOString() ?? null,
        maxSpeed: Math.round(ms),
        distanceKm: t.distanceKm,
        durationMinutes: t.durationMinutes,
      });
    }
    if (ms >= severe) a.severe += 1;
  }

  const vehicleRows = [...byVehicle.values()].map((a, i) => ({
    id: `${a.plate}-${i}`,
    plate: a.plate,
    vehicle: a.vehicle,
    trips: a.trips,
    speeding: a.speeding,
    speedingRate: a.trips > 0 ? a.speeding / a.trips : null,
    topSpeed: Math.round(a.topSpeed),
    idleMinutes: Math.round(a.idleMinutes),
  }));

  const speeders = vehicleRows
    .filter((r) => r.speeding > 0)
    .sort((a, b) => b.speeding - a.speeding || b.topSpeed - a.topSpeed);
  const idlers = [...vehicleRows]
    .filter((r) => r.idleMinutes > 0)
    .sort((a, b) => b.idleMinutes - a.idleMinutes)
    .slice(0, 20);
  incidents.sort((a, b) => b.maxSpeed - a.maxSpeed);

  const analysed = trips.length;

  return {
    key: 'driving-behaviour',
    title: 'Driving Behaviour (trip-derived)',
    description: `Speeding and idling flagged from Cartrack trip telemetry (threshold ${limit} km/h). Vehicle-level — Cartrack trips on this account carry no driver identification.`,
    window: { from: start.toISOString(), to: end.toISOString(), days: Math.round(windowDays) },
    kpis: [
      { label: 'Trips analysed', value: analysed, format: 'int' },
      {
        label: `Speeding trips (≥${limit})`,
        value: totalSpeeding,
        format: 'int',
        tone: totalSpeeding > 0 ? 'warning' : 'success',
      },
      {
        label: 'Speeding rate',
        value: analysed > 0 ? totalSpeeding / analysed : null,
        format: 'percent',
      },
      { label: 'Top speed', value: topSpeedOverall ? `${Math.round(topSpeedOverall)} km/h` : '—' },
      {
        label: 'Vehicles speeding',
        value: speeders.length,
        format: 'int',
        tone: speeders.length > 0 ? 'warning' : 'success',
      },
    ],
    sections: [
      {
        title: `Speeding vehicles — max speed ≥ ${limit} km/h (${speeders.length})`,
        description: `Ranked by number of speeding trips. "Severe" would be ≥ ${severe} km/h.`,
        tone: 'warning',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'trips', header: 'Trips', format: 'int', align: 'right' },
          { key: 'speeding', header: 'Speeding', format: 'int', align: 'right' },
          { key: 'speedingRate', header: 'Rate', format: 'percent', align: 'right' },
          { key: 'topSpeed', header: 'Top km/h', format: 'int', align: 'right' },
        ],
        rows: speeders,
        emptyMessage: `No trips exceeded ${limit} km/h in this window. ✓`,
      },
      {
        title: `Speeding incidents (${incidents.length})`,
        description: `Individual trips at or above ${limit} km/h — the closest thing to per-event safety warnings.`,
        tone: 'danger',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'startTime', header: 'When', format: 'datetime' },
          { key: 'maxSpeed', header: 'Max km/h', format: 'int', align: 'right' },
          { key: 'distanceKm', header: 'Distance', format: 'km', align: 'right' },
          { key: 'durationMinutes', header: 'Duration (min)', format: 'number', align: 'right' },
        ],
        rows: incidents.slice(0, 100),
        emptyMessage: `No speeding incidents in this window. ✓`,
      },
      {
        title: `Excessive idling — top vehicles (${idlers.length})`,
        description: 'Total idling minutes across trips in the window.',
        columns: [
          { key: 'plate', header: 'Plate' },
          { key: 'vehicle', header: 'Vehicle' },
          { key: 'trips', header: 'Trips', format: 'int', align: 'right' },
          { key: 'idleMinutes', header: 'Idle (min)', format: 'int', align: 'right' },
        ],
        rows: idlers,
        emptyMessage: 'No idling recorded in this window.',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
