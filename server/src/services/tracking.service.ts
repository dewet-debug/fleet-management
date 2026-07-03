import prisma from '../config/database';

export type PositionSource = 'cartrack' | 'bolt';

export interface FleetPosition {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  status: string; // vehicle registry status (ACTIVE / IN_SERVICE / ...)
  driverName: string | null;
  lat: number;
  lng: number;
  source: PositionSource;
  lastSeen: string; // ISO
  /** Latest Bolt order status at that location (bolt source only). */
  orderStatus: string | null;
  /** Live telematics extras (cartrack source only). */
  speed: number | null;
  ignition: string | null;
}

/**
 * Current position per registry vehicle.
 *
 * Prefers live Cartrack telematics (real GPS) when the tracker integration is
 * syncing; otherwise falls back to the vehicle's most recent Bolt trip location
 * (last known position). When Cartrack is configured the map upgrades to
 * real-time automatically with no UI change.
 */
export async function getFleetPositions(): Promise<FleetPosition[]> {
  const [vehicles, cartrack, latestTrips] = await Promise.all([
    prisma.vehicle.findMany({ select: { id: true, licensePlate: true, make: true, model: true, status: true } }),
    prisma.cartrackVehicleData.findMany({
      where: { lastLatitude: { not: null }, lastLongitude: { not: null } },
      select: {
        lastLatitude: true,
        lastLongitude: true,
        lastSpeed: true,
        lastIgnitionStatus: true,
        lastEventTime: true,
        cartrackFleetVehicle: { select: { vehicleId: true } },
      },
    }),
    // Latest trip (with coordinates) per vehicle: distinct vehicleId over a
    // newest-first ordering returns the most recent row for each vehicle.
    prisma.boltTrip.findMany({
      where: {
        vehicleId: { not: null },
        OR: [{ dropoffLat: { not: null } }, { pickupLat: { not: null } }],
      },
      orderBy: [{ vehicleId: 'asc' }, { orderCreatedAt: 'desc' }],
      distinct: ['vehicleId'],
      select: {
        vehicleId: true,
        driverName: true,
        orderStatus: true,
        orderCreatedAt: true,
        dropoffLat: true,
        dropoffLng: true,
        pickupLat: true,
        pickupLng: true,
      },
    }),
  ]);

  const cartrackByVehicle = new Map<string, (typeof cartrack)[number]>();
  for (const c of cartrack) {
    const vid = c.cartrackFleetVehicle?.vehicleId;
    if (vid) cartrackByVehicle.set(vid, c);
  }
  const boltByVehicle = new Map<string, (typeof latestTrips)[number]>();
  for (const t of latestTrips) if (t.vehicleId) boltByVehicle.set(t.vehicleId, t);

  const positions: FleetPosition[] = [];
  for (const v of vehicles) {
    const c = cartrackByVehicle.get(v.id);
    if (c && c.lastLatitude != null && c.lastLongitude != null) {
      positions.push({
        vehicleId: v.id,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        status: v.status,
        driverName: null,
        lat: c.lastLatitude,
        lng: c.lastLongitude,
        source: 'cartrack',
        lastSeen: (c.lastEventTime ?? new Date()).toISOString(),
        orderStatus: null,
        speed: c.lastSpeed ?? null,
        ignition: c.lastIgnitionStatus ?? null,
      });
      continue;
    }

    const t = boltByVehicle.get(v.id);
    if (t) {
      const lat = t.dropoffLat ?? t.pickupLat;
      const lng = t.dropoffLng ?? t.pickupLng;
      if (lat != null && lng != null) {
        positions.push({
          vehicleId: v.id,
          licensePlate: v.licensePlate,
          make: v.make,
          model: v.model,
          status: v.status,
          driverName: t.driverName,
          lat,
          lng,
          source: 'bolt',
          lastSeen: t.orderCreatedAt.toISOString(),
          orderStatus: t.orderStatus,
          speed: null,
          ignition: null,
        });
      }
    }
  }

  return positions;
}
