import client from './client';

export interface UploadedPhoto {
  id: string;
  url: string;
  type: string;
  caption: string;
  serviceRecordId: string;
  createdAt: string;
}

export const uploadPhoto = async (
  serviceRecordId: string,
  file: File,
  type: string,
  caption?: string
): Promise<UploadedPhoto> => {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('serviceRecordId', serviceRecordId);
  formData.append('type', type);
  if (caption) {
    formData.append('caption', caption);
  }

  const { data } = await client.post<{ data: UploadedPhoto }>('/uploads/photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.data;
};

export const deletePhoto = async (id: string): Promise<void> => {
  await client.delete(`/uploads/photos/${id}`);
};
