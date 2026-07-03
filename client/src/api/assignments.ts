import client from './client';

export interface Assignment {
  id: string;
  vehicleId: string;
  driverId: string;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentsParams {
  page?: number;
  limit?: number;
  status?: string;
  vehicleId?: string;
  driverId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateAssignmentData {
  vehicleId: string;
  driverId: string;
  startDate: string;
  notes?: string;
}

export const getAssignments = async (
  params?: AssignmentsParams
): Promise<PaginatedResponse<Assignment>> => {
  const { data } = await client.get<{ data: PaginatedResponse<Assignment> }>('/assignments', {
    params,
  });
  return data.data;
};

export const createAssignment = async (
  assignmentData: CreateAssignmentData
): Promise<Assignment> => {
  const { data } = await client.post<{ data: Assignment }>('/assignments', assignmentData);
  return data.data;
};

export const endAssignment = async (id: string): Promise<Assignment> => {
  const { data } = await client.patch<{ data: Assignment }>(`/assignments/${id}/end`);
  return data.data;
};
