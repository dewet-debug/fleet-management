import client from './client';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriversParams {
  page?: number;
  limit?: number;
  status?: string;
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

export const getDrivers = async (params?: DriversParams): Promise<PaginatedResponse<Driver>> => {
  const { data } = await client.get<{ data: PaginatedResponse<Driver> }>('/drivers', { params });
  return data.data;
};

export const getDriver = async (id: string): Promise<Driver> => {
  const { data } = await client.get<{ data: Driver }>(`/drivers/${id}`);
  return data.data;
};

export const createDriver = async (driverData: Partial<Driver>): Promise<Driver> => {
  const { data } = await client.post<{ data: Driver }>('/drivers', driverData);
  return data.data;
};

export const updateDriver = async (id: string, driverData: Partial<Driver>): Promise<Driver> => {
  const { data } = await client.patch<{ data: Driver }>(`/drivers/${id}`, driverData);
  return data.data;
};

export const deleteDriver = async (id: string): Promise<void> => {
  await client.delete(`/drivers/${id}`);
};

export const bulkDeleteDrivers = async (ids: string[]): Promise<{ deleted: string[]; failed: { id: string; reason: string }[] }> => {
  const { data } = await client.post('/drivers/bulk-delete', { ids });
  return data.data;
};

export const getDriverCosts = async (id: string, period: 'weekly' | 'monthly' = 'weekly') => {
  const { data } = await client.get(`/drivers/${id}/costs`, { params: { period } });
  return data.data;
};
