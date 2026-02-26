import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  bulkDeleteDrivers,
  getDriverCosts,
} from '../api/drivers';
import type { DriversParams, Driver } from '../api/drivers';

export const useDrivers = (params?: DriversParams) => {
  return useQuery({
    queryKey: ['drivers', params],
    queryFn: () => getDrivers(params),
  });
};

export const useDriver = (id: string) => {
  return useQuery({
    queryKey: ['drivers', id],
    queryFn: () => getDriver(id),
    enabled: !!id,
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Driver>) => createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver created successfully');
    },
    onError: () => {
      toast.error('Failed to create driver');
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) => updateDriver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver updated successfully');
    },
    onError: () => {
      toast.error('Failed to update driver');
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete driver');
    },
  });
};

export const useDriverCosts = (id: string, period: 'weekly' | 'monthly') => {
  return useQuery({
    queryKey: ['drivers', id, 'costs', period],
    queryFn: () => getDriverCosts(id, period),
    enabled: !!id,
  });
};
