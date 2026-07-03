import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchProfitability } from '../api/analytics';

export function useProfitability(params: { dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['profitability', params],
    queryFn: () => fetchProfitability(params),
    placeholderData: keepPreviousData,
  });
}
