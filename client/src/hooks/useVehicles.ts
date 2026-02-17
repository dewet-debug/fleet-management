import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateKilometers,
  getVehicleCosts,
} from '../api/vehicles';
import type { VehiclesParams, Vehicle } from '../api/vehicles';

export const useVehicles = (params?: VehiclesParams) => {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => getVehicles(params),
  });
};

export const useVehicle = (id: string) => {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicle(id),
    enabled: !!id,
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Vehicle>) => createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle created successfully');
    },
    onError: () => {
      toast.error('Failed to create vehicle');
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle updated successfully');
    },
    onError: () => {
      toast.error('Failed to update vehicle');
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete vehicle');
    },
  });
};

export const useUpdateKilometers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, kilometers }: { id: string; kilometers: number }) => updateKilometers(id, kilometers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Kilometers updated successfully');
    },
    onError: () => {
      toast.error('Failed to update kilometers');
    },
  });
};

export function useVehicleCosts(id: string) {
  return useQuery({
    queryKey: ['vehicles', id, 'costs'],
    queryFn: () => getVehicleCosts(id),
    enabled: !!id,
  });
}
