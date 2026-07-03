import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchProfitability, fetchDriverPerformance } from '../api/analytics';

export function useProfitability(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['profitability', params],
    queryFn: () => fetchProfitability(params),
    placeholderData: keepPreviousData,
  });
}

export function useDriverPerformance(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['driver-performance', params],
    queryFn: () => fetchDriverPerformance(params),
    placeholderData: keepPreviousData,
  });
}
