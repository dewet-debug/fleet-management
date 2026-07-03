import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineSquares2X2,
  HiOutlineTruck,
  HiOutlineUsers,
  HiOutlineLink,
  HiOutlineWrench,
  HiOutlineReceiptPercent,
  HiOutlineArrowUpTray,
  HiOutlineSignal,
  HiOutlineBolt,
  HiOutlineCog6Tooth,
  HiOutlineBuildingOffice2,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineBanknotes,
} from 'react-icons/hi2';
import type { IconType } from 'react-icons';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-control text-sm font-medium transition-colors max-lg:justify-center max-lg:px-0 max-sm:justify-start max-sm:px-3 ${
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-ink-body hover:bg-paper-sunken hover:text-ink'
  }`;

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 font-mono text-meta uppercase tracking-wider text-ink-ghost">
      <span className="max-lg:hidden max-sm:inline">{children}</span>
    </p>
  );
}

function NavItem({ to, icon: Icon, label, end, health, onNavigate }: {
  to: string; icon: IconType; label: string; end?: boolean; health?: boolean; onNavigate?: () => void;
}) {
  return (
    <NavLink to={to} end={end} className={linkClass} title={label} onClick={onNavigate}>
      <Icon className="text-lg shrink-0" />
      <span className="truncate max-lg:hidden max-sm:inline">{label}</span>
      {health && (
        <span
          className="ml-auto h-2 w-2 rounded-pill bg-success max-lg:ml-0 max-sm:ml-auto"
          title="Connected"
        />
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen = false, onClose }: {
  mobileOpen?: boolean; onClose?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'FLEET_MANAGER';
  const isServiceCo = user?.role === 'SERVICE_COMPANY';

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen w-[236px] flex-col border-r border-paper-line bg-paper-card transition-transform max-lg:w-[62px] max-sm:w-[236px] sm:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* wordmark */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-paper-hair max-lg:justify-center max-lg:px-0 max-sm:justify-start max-sm:px-5">
        <img
          src="/assemble49-mark.png"
          alt="Assemble49"
          className="h-9 w-9 shrink-0 rounded-control object-cover ring-1 ring-paper-line"
        />
        <div className="leading-tight max-lg:hidden max-sm:block">
          <p className="text-sm font-bold text-ink">Assemble49</p>
          <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Fleet Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {!isServiceCo && (
          <>
            <GroupLabel>Main</GroupLabel>
            <div className="space-y-0.5">
              <NavItem to="/" end icon={HiOutlineSquares2X2} label="Dashboard" onNavigate={onClose} />
              <NavItem to="/vehicles" icon={HiOutlineTruck} label="Vehicles" onNavigate={onClose} />
              <NavItem to="/drivers" icon={HiOutlineUsers} label="Drivers" onNavigate={onClose} />
              <NavItem to="/assignments" icon={HiOutlineLink} label="Assignments" onNavigate={onClose} />
              <NavItem to="/services" icon={HiOutlineWrench} label="Services" onNavigate={onClose} />
              <NavItem to="/bolt-trips" icon={HiOutlineReceiptPercent} label="Bolt Trips" onNavigate={onClose} />
              <NavItem to="/profitability" icon={HiOutlineBanknotes} label="Profitability" onNavigate={onClose} />
              <NavItem to="/live-map" icon={HiOutlineMapPin} label="Live Map" onNavigate={onClose} />
              {(isAdmin || isManager) && (
                <NavItem to="/bulk-upload" icon={HiOutlineArrowUpTray} label="Bulk Upload" onNavigate={onClose} />
              )}
            </div>
          </>
        )}

        {(isAdmin || isManager) && (
          <>
            <GroupLabel>Integrations</GroupLabel>
            <div className="space-y-0.5">
              {isAdmin && <NavItem to="/admin/cartrack" icon={HiOutlineSignal} label="Cartrack" health onNavigate={onClose} />}
              <NavItem to="/admin/a49" icon={HiOutlineBolt} label="MNC · A49" health onNavigate={onClose} />
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <GroupLabel>Admin</GroupLabel>
            <div className="space-y-0.5">
              <NavItem to="/admin/users" icon={HiOutlineCog6Tooth} label="Users" onNavigate={onClose} />
              <NavItem to="/admin/service-types" icon={HiOutlineCog6Tooth} label="Service Types" onNavigate={onClose} />
              <NavItem to="/admin/service-intervals" icon={HiOutlineClock} label="Service Intervals" onNavigate={onClose} />
            </div>
          </>
        )}

        {isServiceCo && (
          <>
            <GroupLabel>Portal</GroupLabel>
            <div className="space-y-0.5">
              <NavItem to="/portal" icon={HiOutlineBuildingOffice2} label="Service Portal" onNavigate={onClose} />
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
