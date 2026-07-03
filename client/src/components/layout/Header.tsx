import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/useTheme';
import {
  HiArrowRightOnRectangle,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineBars3,
  HiOutlineBars4,
} from 'react-icons/hi2';

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  FLEET_MANAGER: 'Fleet Manager',
  SERVICE_COMPANY: 'Service Company',
};

const seg = (active: boolean) =>
  `grid h-7 w-7 place-items-center rounded-[6px] text-base transition-colors ${
    active ? 'bg-primary-500 text-white' : 'text-ink-faint hover:text-ink'
  }`;

function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-0.5 rounded-control border border-paper-line bg-paper-card p-[3px]">
      {children}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme, density, setDensity } = useTheme();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-end gap-3 border-b border-paper-line bg-paper-card px-6">
      {/* density */}
      <Segmented>
        <button className={seg(density === 'comfortable')} onClick={() => setDensity('comfortable')} title="Comfortable density">
          <HiOutlineBars3 />
        </button>
        <button className={seg(density === 'compact')} onClick={() => setDensity('compact')} title="Compact density">
          <HiOutlineBars4 />
        </button>
      </Segmented>

      {/* theme */}
      <Segmented>
        <button className={seg(theme === 'light')} onClick={() => setTheme('light')} title="Light">
          <HiOutlineSun />
        </button>
        <button className={seg(theme === 'dark')} onClick={() => setTheme('dark')} title="Dark">
          <HiOutlineMoon />
        </button>
      </Segmented>

      <span className="mx-1 h-6 w-px bg-paper-line" />

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
        className="rounded-control p-2 text-ink-faint transition-colors hover:bg-paper-sunken hover:text-ink"
        title="Logout"
      >
        <HiArrowRightOnRectangle className="text-xl" />
      </button>
    </header>
  );
}
