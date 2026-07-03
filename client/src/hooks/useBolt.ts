import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchBoltTrips,
  fetchBoltTripsSummary,
  fetchBoltAnalytics,
  fetchBoltSyncLogs,
  fetchBoltStatus,
  triggerBoltSync,
  BoltTripFilters,
} from '../api/bolt';

export function useBoltTrips(params: BoltTripFilters) {
  return useQuery({
    queryKey: ['bolt-trips', params],
    queryFn: () => fetchBoltTrips(params),
    placeholderData: keepPreviousData,
  });
}

export function useBoltTripsSummary(params: Omit<BoltTripFilters, 'page' | 'limit'>) {
  return useQuery({
    queryKey: ['bolt-trips-summary', params],
    queryFn: () => fetchBoltTripsSummary(params),
    placeholderData: keepPreviousData,
  });
}

export function useBoltAnalytics(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['bolt-analytics', params],
    queryFn: () => fetchBoltAnalytics(params),
    placeholderData: keepPreviousData,
  });
}

export function useBoltStatus() {
  return useQuery({
    queryKey: ['bolt-status'],
    queryFn: fetchBoltStatus,
    // while a sync is running, poll so the console updates live
    refetchInterval: (q) => (q.state.data?.running ? 5000 : false),
  });
}

export function useBoltSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerBoltSync,
    onSuccess: () => {
      toast.success('Bolt download started — watch the sync log for progress.');
      qc.invalidateQueries({ queryKey: ['bolt-status'] });
      qc.invalidateQueries({ queryKey: ['bolt-sync-logs'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error?.message || 'Failed to start Bolt download.');
    },
  });
}

export function useBoltSyncLogs(params: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['bolt-sync-logs', params],
    queryFn: () => fetchBoltSyncLogs(params),
  });
}
