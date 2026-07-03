import client from './client';

export type PositionSource = 'cartrack' | 'bolt';

export interface FleetPosition {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  status: string;
  driverName: string | null;
  lat: number;
  lng: number;
  source: PositionSource;
  lastSeen: string;
  orderStatus: string | null;
  speed: number | null;
  ignition: string | null;
}

export interface FleetPositionsResponse {
  success: boolean;
  data: FleetPosition[];
  meta: { total: number; sources: Record<string, number> };
}

export async function fetchFleetPositions() {
  const { data } = await client.get<FleetPositionsResponse>('/tracking/positions');
  return data;
}
