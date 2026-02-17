import client from './client';

export interface DashboardMetrics {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  pendingServices: number;
  overdueServices: number;
  activeAssignments: number;
  utilizationRate: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  entityId: string;
  entityType: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  entityId: string;
  entityType: string;
  isRead: boolean;
  createdAt: string;
}

export const getMetrics = async (): Promise<DashboardMetrics> => {
  const { data } = await client.get<{ data: DashboardMetrics }>('/dashboard/metrics');
  return data.data;
};

export const getActivity = async (): Promise<ActivityItem[]> => {
  const { data } = await client.get<{ data: ActivityItem[] }>('/dashboard/activity');
  return data.data;
};

export const getAlerts = async (): Promise<Alert[]> => {
  const { data } = await client.get<{ data: Alert[] }>('/dashboard/alerts');
  return data.data;
};
