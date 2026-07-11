import client, { API_BASE } from './client';

export interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; field?: string; message: string }[];
}

async function uploadFile(endpoint: string, file: File): Promise<BulkUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export const uploadVehicles = (file: File) => uploadFile('/bulk-upload/vehicles', file);
export const uploadDrivers = (file: File) => uploadFile('/bulk-upload/drivers', file);
export const uploadServices = (file: File) => uploadFile('/bulk-upload/services', file);
export const uploadAssignments = (file: File) => uploadFile('/bulk-upload/assignments', file);

export const getTemplateUrl = (type: string) => `${API_BASE}/bulk-upload/templates/${type}`;
