import { useAuth } from '../../context/AuthContext';
import { HiArrowRightOnRectangle } from 'react-icons/hi2';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="Logout"
        >
          <HiArrowRightOnRectangle className="text-xl" />
        </button>
      </div>
    </header>
  );
}
