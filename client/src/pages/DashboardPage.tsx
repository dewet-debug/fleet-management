import { Link } from 'react-router-dom';
import { useDashboardMetrics, useDashboardActivity, useDashboardAlerts } from '../hooks/useDashboard';
import { Card, Badge, LoadingSpinner } from '../components/ui';
import {
  HiTruck,
  HiUsers,
  HiArrowsRightLeft,
  HiWrenchScrewdriver,
  HiPlus,
  HiExclamationTriangle,
  HiCurrencyDollar,
} from 'react-icons/hi2';
import { formatCurrency } from '../utils/currency';

const metricConfig = [
  { key: 'totalVehicles', label: 'Total Vehicles', icon: HiTruck, color: 'bg-blue-500' },
  { key: 'activeVehicles', label: 'Active Vehicles', icon: HiTruck, color: 'bg-green-500' },
  { key: 'inServiceVehicles', label: 'In Service', icon: HiWrenchScrewdriver, color: 'bg-yellow-500' },
  { key: 'totalDrivers', label: 'Total Drivers', icon: HiUsers, color: 'bg-purple-500' },
  { key: 'activeDrivers', label: 'Active Drivers', icon: HiUsers, color: 'bg-indigo-500' },
  { key: 'activeAssignments', label: 'Active Assignments', icon: HiArrowsRightLeft, color: 'bg-cyan-500' },
  { key: 'totalServiceRecords', label: 'Service Records', icon: HiWrenchScrewdriver, color: 'bg-orange-500' },
  { key: 'pendingServices', label: 'Pending Services', icon: HiExclamationTriangle, color: 'bg-red-500' },
];

export default function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity();
  const { data: alerts, isLoading: alertsLoading } = useDashboardAlerts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/vehicles" className="inline-flex items-center gap-1 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
            <HiPlus /> Add Vehicle
          </Link>
          <Link to="/services" className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
            <HiPlus /> New Service
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricConfig.map((m) => (
          <Card key={m.key} className="!p-4">
            <div className="flex items-center gap-3">
              <div className={`${m.color} p-2 rounded-lg`}>
                <m.icon className="text-xl text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metricsLoading ? '...' : (metrics as any)?.[m.key] ?? 0}
                </p>
                <p className="text-xs text-gray-500">{m.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <HiCurrencyDollar className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {metricsLoading ? '...' : formatCurrency((metrics as any)?.serviceCostsMTD ?? 0, 'ZAR')}
              </p>
              <p className="text-xs text-gray-500">Service Costs MTD</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2 rounded-lg">
              <HiCurrencyDollar className="text-xl text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {metricsLoading ? '...' : formatCurrency((metrics as any)?.serviceCostsYTD ?? 0, 'ZAR')}
              </p>
              <p className="text-xs text-gray-500">Service Costs YTD</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card title="Recent Activity">
          {activityLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activity?.data?.length === 0 && (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
              {activity?.data?.map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700">
                      <span className="font-medium">{item.action}</span> on{' '}
                      <span className="font-medium">{item.entityType}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleString()}
                      {item.user && ` by ${item.user.firstName} ${item.user.lastName}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Service Alerts */}
        <Card title="Service Alerts">
          {alertsLoading ? (
            <LoadingSpinner size="md" />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts?.data?.length === 0 && (
                <p className="text-sm text-gray-500">No service alerts</p>
              )}
              {alerts?.data?.map((alert: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <HiExclamationTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{alert.vehicle?.make} {alert.vehicle?.model}</p>
                    <p className="text-gray-600">{alert.message || 'Service due'}</p>
                    <Badge color="yellow">{alert.type || 'Due'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
