import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchBoltTrips, fetchBoltTripsSummary, fetchBoltAnalytics, fetchBoltSyncLogs, BoltTripFilters } from '../api/bolt';

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

export function useBoltSyncLogs(params: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['bolt-sync-logs', params],
    queryFn: () => fetchBoltSyncLogs(params),
  });
}
