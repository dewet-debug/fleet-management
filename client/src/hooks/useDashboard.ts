import { useQuery } from '@tanstack/react-query';
import { getMetrics, getActivity, getAlerts } from '../api/dashboard';

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: getMetrics,
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};

export const useDashboardActivity = () => {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: getActivity,
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  });
};

export const useDashboardAlerts = () => {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: getAlerts,
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  });
};
