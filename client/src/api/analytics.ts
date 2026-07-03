import client from './client';

export interface VehicleProfitability {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  status: string;
  finishedTrips: number;
  grossRevenue: number;
  netEarnings: number;
  commission: number;
  distanceKm: number;
  activeDays: number;
  revenuePerKm: number | null;
  revenuePerActiveDay: number | null;
  utilisation: number | null;
  serviceCost: number | null;
  leaseCost: number | null;
  runningCost: number | null;
  netProfit: number | null;
  costPerKm: number | null;
  telematicsOdometerKm: number | null;
}

export interface ProfitabilityResponse {
  window: { from: string; to: string; days: number };
  dataCoverage: { bolt: boolean; internalCosts: boolean; cartrackTelematics: boolean };
  totals: {
    vehicles: number;
    grossRevenue: number;
    netEarnings: number;
    commission: number;
    distanceKm: number;
    runningCost: number | null;
    netProfit: number | null;
    revenuePerKm: number | null;
  };
  vehicles: VehicleProfitability[];
}

export async function fetchProfitability(params: { dateFrom?: string; dateTo?: string }) {
  const { data } = await client.get<{ success: boolean; data: ProfitabilityResponse }>(
    '/analytics/profitability',
    { params },
  );
  return data.data;
}
