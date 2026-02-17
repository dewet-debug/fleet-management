import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getServices,
  getService,
  createService,
  updateService,
  transitionService,
  getServiceTypes,
  createServiceType,
  updateServiceType,
  getServiceIntervals,
  createServiceInterval,
  updateServiceInterval,
} from '../api/services';
import type { ServicesParams, TransitionData } from '../api/services';

export const useServices = (params?: ServicesParams) => {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => getServices(params),
  });
};

export const useService = (id: string) => {
  return useQuery({
    queryKey: ['services', id],
    queryFn: () => getService(id),
    enabled: !!id,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createService(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateService(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); },
  });
};

export const useTransitionService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransitionData }) => transitionService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

export const useServiceTypes = () => {
  return useQuery({
    queryKey: ['serviceTypes'],
    queryFn: () => getServiceTypes(),
  });
};

export const useCreateServiceType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createServiceType(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceTypes'] }); },
  });
};

export const useUpdateServiceType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateServiceType(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceTypes'] }); },
  });
};

export const useServiceIntervals = () => {
  return useQuery({
    queryKey: ['serviceIntervals'],
    queryFn: () => getServiceIntervals(),
  });
};

export const useCreateServiceInterval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createServiceInterval(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceIntervals'] }); },
  });
};

export const useUpdateServiceInterval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateServiceInterval(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['serviceIntervals'] }); },
  });
};
