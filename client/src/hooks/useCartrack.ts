import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCartrackConfig,
  updateCartrackConfig,
  testCartrackConnection,
  getFleetVehicles,
  addFleetVehicle,
  bulkAddFleetVehicles,
  removeFleetVehicle,
  triggerSync,
  getSchedulerStatus,
  getSyncLogs,
  getSyncLogById,
} from '../api/cartrack';
import toast from 'react-hot-toast';

// ---- Config ----

export const useCartrackConfig = () =>
  useQuery({ queryKey: ['cartrack', 'config'], queryFn: getCartrackConfig });

export const useUpdateCartrackConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCartrackConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartrack', 'config'] });
      qc.invalidateQueries({ queryKey: ['cartrack', 'scheduler-status'] });
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Failed to update configuration'),
  });
};

export const useTestConnection = () =>
  useMutation({
    mutationFn: testCartrackConnection,
    onSuccess: (data) => {
      if (data.success) toast.success(data.message);
      else toast.error(data.message);
    },
    onError: () => toast.error('Connection test failed'),
  });

// ---- Fleet Vehicles ----

export const useFleetVehicles = (params?: { page?: number; limit?: number; search?: string }) =>
  useQuery({ queryKey: ['cartrack', 'fleet-vehicles', params], queryFn: () => getFleetVehicles(params) });

export const useAddFleetVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addFleetVehicle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartrack', 'fleet-vehicles'] });
      toast.success('Vehicle added to Cartrack sync');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to add vehicle'),
  });
};

export const useBulkAddFleetVehicles = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkAddFleetVehicles,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartrack', 'fleet-vehicles'] });
      toast.success('Vehicles added to Cartrack sync');
    },
    onError: () => toast.error('Failed to bulk add vehicles'),
  });
};

export const useRemoveFleetVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeFleetVehicle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartrack', 'fleet-vehicles'] });
      toast.success('Vehicle removed from Cartrack sync');
    },
    onError: () => toast.error('Failed to remove vehicle'),
  });
};

// ---- Sync ----

export const useTriggerSync = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartrack', 'sync-logs'] });
      qc.invalidateQueries({ queryKey: ['cartrack', 'scheduler-status'] });
      toast.success('Sync triggered');
    },
    onError: () => toast.error('Failed to trigger sync'),
  });
};

export const useSchedulerStatus = () =>
  useQuery({
    queryKey: ['cartrack', 'scheduler-status'],
    queryFn: getSchedulerStatus,
    refetchInterval: 10000,
  });

export const useSyncLogs = (params?: { page?: number; limit?: number; syncType?: string; status?: string }) =>
  useQuery({ queryKey: ['cartrack', 'sync-logs', params], queryFn: () => getSyncLogs(params) });

export const useSyncLog = (id: string) =>
  useQuery({ queryKey: ['cartrack', 'sync-logs', id], queryFn: () => getSyncLogById(id), enabled: !!id });
