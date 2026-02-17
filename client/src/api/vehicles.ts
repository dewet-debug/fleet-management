import client from './client';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  status: string;
  currentKilometers: number;
  fuelType: string;
  color: string;
  purchasePrice?: number;
  currency: string;
  fleetNumber?: string;
  leaseCompany?: string;
  leaseAgreementNo?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  monthlyLeaseCost?: number;
  currentBookValue?: number;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  coverageType?: string;
  policyStartDate?: string;
  policyExpiryDate?: string;
  premiumAmount?: number;
  registrationExpiry?: string;
  warrantyExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclesParams {
  page?: number;
  limit?: number;
  status?: string;
  make?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getVehicles = async (params?: VehiclesParams): Promise<PaginatedResponse<Vehicle>> => {
  const { data } = await client.get<{ data: PaginatedResponse<Vehicle> }>('/vehicles', { params });
  return data.data;
};

export const getVehicle = async (id: string): Promise<Vehicle> => {
  const { data } = await client.get<{ data: Vehicle }>(`/vehicles/${id}`);
  return data.data;
};

export const createVehicle = async (vehicleData: Partial<Vehicle>): Promise<Vehicle> => {
  const { data } = await client.post<{ data: Vehicle }>('/vehicles', vehicleData);
  return data.data;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>): Promise<Vehicle> => {
  const { data } = await client.patch<{ data: Vehicle }>(`/vehicles/${id}`, vehicleData);
  return data.data;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await client.delete(`/vehicles/${id}`);
};

export const updateKilometers = async (id: string, kilometers: number): Promise<Vehicle> => {
  const { data } = await client.patch<{ data: Vehicle }>(`/vehicles/${id}/kilometers`, { kilometers });
  return data.data;
};

export async function getVehicleCosts(id: string) {
  const { data } = await client.get(`/vehicles/${id}/costs`);
  return data.data;
}
