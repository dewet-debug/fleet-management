import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncA49All, syncA49Drivers, syncA49JobCards, fetchA49Drivers, fetchA49JobCards, fetchA49SyncLogs } from '../api/a49';
import toast from 'react-hot-toast';

export function useA49Drivers(params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['a49-drivers', params],
    queryFn: () => fetchA49Drivers(params),
  });
}

export function useA49JobCards(params: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['a49-job-cards', params],
    queryFn: () => fetchA49JobCards(params),
  });
}

export function useA49SyncLogs(params: { page?: number; limit?: number; syncType?: string; status?: string }) {
  return useQuery({
    queryKey: ['a49-sync-logs', params],
    queryFn: () => fetchA49SyncLogs(params),
  });
}

export function useSyncA49All() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncA49All,
    onSuccess: (data) => {
      toast.success(`A49 sync complete: ${data.data.drivers.fetched} drivers, ${data.data.jobCards.fetched} job cards`);
      queryClient.invalidateQueries({ queryKey: ['a49-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['a49-job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['a49-sync-logs'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'A49 sync failed');
    },
  });
}

export function useSyncA49Drivers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncA49Drivers,
    onSuccess: (data) => {
      toast.success(`Synced ${data.data.fetched} drivers`);
      queryClient.invalidateQueries({ queryKey: ['a49-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['a49-sync-logs'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Driver sync failed');
    },
  });
}

export function useSyncA49JobCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncA49JobCards,
    onSuccess: (data) => {
      toast.success(`Synced ${data.data.fetched} job cards`);
      queryClient.invalidateQueries({ queryKey: ['a49-job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['a49-sync-logs'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Job card sync failed');
    },
  });
}
