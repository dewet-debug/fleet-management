import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchFleetPositions } from '../api/tracking';

/** Fleet positions, auto-refreshing every 30s for the live map. */
export function useFleetPositions() {
  return useQuery({
    queryKey: ['fleet-positions'],
    queryFn: fetchFleetPositions,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}
