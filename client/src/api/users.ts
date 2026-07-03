import client from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsersParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  isActive?: boolean;
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

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

export const getUsers = async (params?: UsersParams): Promise<PaginatedResponse<User>> => {
  const { data } = await client.get<{ data: PaginatedResponse<User> }>('/users', { params });
  return data.data;
};

export const getUser = async (id: string): Promise<User> => {
  const { data } = await client.get<{ data: User }>(`/users/${id}`);
  return data.data;
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const { data } = await client.post<{ data: User }>('/users', userData);
  return data.data;
};

export const updateUser = async (id: string, userData: UpdateUserData): Promise<User> => {
  const { data } = await client.patch<{ data: User }>(`/users/${id}`, userData);
  return data.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await client.delete(`/users/${id}`);
};
