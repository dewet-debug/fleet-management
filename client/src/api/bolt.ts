import client from './client';

export interface BoltTrip {
  id: string;
  orderReference: string;
  companyId: number | null;
  vehicleLicensePlate: string | null;
  vehicleId: string | null;
  vehicleModel: string | null;
  driverName: string | null;
  driverPhone: string | null;
  orderStatus: string;
  paymentMethod: string | null;
  isScheduled: boolean;
  categoryName: string | null;
  pickupAddress: string | null;
  destinationAddress: string | null;
  rideDistanceMeters: number | null;
  orderCreatedAt: string;
  orderFinishedAt: string | null;
  ridePrice: number | null;
  netEarnings: number | null;
  commission: number | null;
  bookingFee: number | null;
  tip: number | null;
  cashDiscount: number | null;
  currency: string;
}

export interface BoltTripsSummary {
  totalOrders: number;
  finishedTrips: number;
  byStatus: { status: string; count: number }[];
  revenue: {
    grossFare: number;
    netEarnings: number;
    commission: number;
    bookingFees: number;
    tips: number;
    cashDiscounts: number;
    tollFees: number;
  };
  totalDistanceKm: number;
  matchedToVehicle: number;
  unmatchedToVehicle: number;
}

export interface BoltAnalytics {
  window: { from: string; to: string };
  dailyTrend: { day: string; attempts: number; finished: number; gross: number; net: number; commission: number; fees: number }[];
  paymentMix: { method: string; count: number; gross: number }[];
  funnel: { attempts: number; accepted: number; finished: number; netPaid: number };
  topVehicles: { plate: string; model: string | null; trips: number; gross: number }[];
  pickupZones: { lat: number; lng: number; count: number; sampleAddress: string | null }[];
}

export interface BoltSyncLog {
  id: string;
  syncType: string;
  status: string;
  triggeredBy: string;
  windowStart: string | null;
  windowEnd: string | null;
  startedAt: string;
  completedAt: string | null;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsMatched: number;
  recordsErrored: number;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface BoltPaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface BoltTripFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  matched?: 'matched' | 'unmatched';
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchBoltTrips(params: BoltTripFilters) {
  const { data } = await client.get<BoltPaginatedResponse<BoltTrip>>('/bolt/trips', { params });
  return data;
}

export async function fetchBoltTripsSummary(params: Omit<BoltTripFilters, 'page' | 'limit'>) {
  const { data } = await client.get<{ success: boolean; data: BoltTripsSummary }>('/bolt/trips/summary', {
    params,
  });
  return data.data;
}

export async function fetchBoltAnalytics(params: { dateFrom?: string; dateTo?: string }) {
  const { data } = await client.get<{ success: boolean; data: BoltAnalytics }>('/bolt/trips/analytics', { params });
  return data.data;
}

export async function fetchBoltSyncLogs(params: { page?: number; limit?: number; status?: string }) {
  const { data } = await client.get<BoltPaginatedResponse<BoltSyncLog>>('/bolt/sync-logs', { params });
  return data;
}
