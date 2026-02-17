import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VehicleListPage from './pages/VehicleListPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import DriverListPage from './pages/DriverListPage';
import DriverDetailPage from './pages/DriverDetailPage';
import AssignmentListPage from './pages/AssignmentListPage';
import ServiceListPage from './pages/ServiceListPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import ServiceTypesPage from './pages/ServiceTypesPage';
import ServiceIntervalsPage from './pages/ServiceIntervalsPage';
import ServiceProviderPortalPage from './pages/ServiceProviderPortalPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="vehicles" element={<VehicleListPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="drivers" element={<DriverListPage />} />
          <Route path="drivers/:id" element={<DriverDetailPage />} />
          <Route path="assignments" element={<AssignmentListPage />} />
          <Route path="services" element={<ServiceListPage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/service-types"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <ServiceTypesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/service-intervals"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <ServiceIntervalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="portal"
            element={
              <ProtectedRoute roles={['SERVICE_COMPANY']}>
                <ServiceProviderPortalPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
