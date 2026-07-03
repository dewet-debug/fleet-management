import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-paper-bg">
      <Sidebar />
      <div className="ml-[236px]">
        <Header />
        <main className="px-6 pb-10 pt-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
