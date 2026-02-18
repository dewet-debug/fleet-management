import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiSquares2X2,
  HiTruck,
  HiUsers,
  HiArrowsRightLeft,
  HiWrenchScrewdriver,
  HiCog6Tooth,
  HiBuildingOffice2,
  HiSignal,
} from 'react-icons/hi2';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  }`;

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-700 flex items-center gap-2">
          <HiTruck className="text-2xl" />
          Fleet Manager
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink to="/" end className={navLinkClass}>
          <HiSquares2X2 className="text-lg" /> Dashboard
        </NavLink>
        <NavLink to="/vehicles" className={navLinkClass}>
          <HiTruck className="text-lg" /> Vehicles
        </NavLink>
        <NavLink to="/drivers" className={navLinkClass}>
          <HiUsers className="text-lg" /> Drivers
        </NavLink>
        <NavLink to="/assignments" className={navLinkClass}>
          <HiArrowsRightLeft className="text-lg" /> Assignments
        </NavLink>
        <NavLink to="/services" className={navLinkClass}>
          <HiWrenchScrewdriver className="text-lg" /> Services
        </NavLink>

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
            </div>
            <NavLink to="/admin/users" className={navLinkClass}>
              <HiCog6Tooth className="text-lg" /> Users
            </NavLink>
            <NavLink to="/admin/service-types" className={navLinkClass}>
              <HiCog6Tooth className="text-lg" /> Service Types
            </NavLink>
            <NavLink to="/admin/service-intervals" className={navLinkClass}>
              <HiCog6Tooth className="text-lg" /> Intervals
            </NavLink>
            <NavLink to="/admin/cartrack" className={navLinkClass}>
              <HiSignal className="text-lg" /> Cartrack
            </NavLink>
          </>
        )}

        {user?.role === 'SERVICE_COMPANY' && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Portal</p>
            </div>
            <NavLink to="/portal" className={navLinkClass}>
              <HiBuildingOffice2 className="text-lg" /> Service Portal
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
