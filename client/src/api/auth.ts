import client from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const login = async (email: string, password: string): Promise<User> => {
  const { data } = await client.post<{ data: LoginResponse }>('/auth/login', {
    email,
    password,
  });

  const { accessToken, refreshToken, user } = data.data;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  return user;
};

export const logout = async (): Promise<void> => {
  try {
    await client.post('/auth/logout');
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export const getMe = async (): Promise<User> => {
  const { data } = await client.get<{ data: User }>('/auth/me');
  return data.data;
};

export const refreshToken = async (): Promise<LoginResponse> => {
  const token = localStorage.getItem('refreshToken');
  const { data } = await client.post<{ data: LoginResponse }>('/auth/refresh', {
    refreshToken: token,
  });
  return data.data;
};
