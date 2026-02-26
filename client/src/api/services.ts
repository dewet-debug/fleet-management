import client from './client';

export interface ServicesParams {
  page?: number;
  limit?: number;
  status?: string;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransitionData {
  action: string;
  notes?: string;
}

export const getServices = async (params?: ServicesParams) => {
  const { data } = await client.get('/services', { params });
  return data.data;
};

export const getService = async (id: string) => {
  const { data } = await client.get(`/services/${id}`);
  return data.data;
};

export const createService = async (serviceData: any) => {
  const { data } = await client.post('/services', serviceData);
  return data.data;
};

export const updateService = async (id: string, serviceData: any) => {
  const { data } = await client.patch(`/services/${id}`, serviceData);
  return data.data;
};

export const transitionService = async (id: string, transitionData: TransitionData) => {
  const { data } = await client.post(`/services/${id}/transition`, transitionData);
  return data.data;
};

export const bulkDeleteServices = async (ids: string[]): Promise<{ deleted: string[]; failed: { id: string; reason: string }[] }> => {
  const { data } = await client.post('/services/bulk-delete', { ids });
  return data.data;
};

export const getServiceTypes = async (params?: any) => {
  const { data } = await client.get('/service-types', { params });
  return data.data;
};

export const createServiceType = async (typeData: any) => {
  const { data } = await client.post('/service-types', typeData);
  return data.data;
};

export const updateServiceType = async (id: string, typeData: any) => {
  const { data } = await client.patch(`/service-types/${id}`, typeData);
  return data.data;
};

export const getServiceIntervals = async (params?: any) => {
  const { data } = await client.get('/service-intervals', { params });
  return data.data;
};

export const createServiceInterval = async (intervalData: any) => {
  const { data } = await client.post('/service-intervals', intervalData);
  return data.data;
};

export const updateServiceInterval = async (id: string, intervalData: any) => {
  const { data } = await client.patch(`/service-intervals/${id}`, intervalData);
  return data.data;
};
