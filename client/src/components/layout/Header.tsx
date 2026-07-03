import { useAuth } from '../../context/AuthContext';
import { HiArrowRightOnRectangle } from 'react-icons/hi2';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  FLEET_MANAGER: 'Fleet Manager',
  SERVICE_COMPANY: 'Service Company',
};

export default function Header() {
  const { user, logout } = useAuth();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-end gap-4 border-b border-paper-line bg-paper-sunken/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-pill bg-primary-50 font-mono text-xs font-semibold text-primary-700">
          {initials || '—'}
        </span>
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold text-ink">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">
            {roleLabels[user?.role ?? ''] ?? user?.role}
          </p>
        </div>
      </div>
      <button
        onClick={logout}
        className="rounded-control p-2 text-ink-faint transition-colors hover:bg-paper-line/60 hover:text-ink"
        title="Logout"
      >
        <HiArrowRightOnRectangle className="text-xl" />
      </button>
    </header>
  );
}
