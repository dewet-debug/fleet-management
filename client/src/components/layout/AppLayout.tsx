import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HiOutlineBars3 } from 'react-icons/hi2';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper-bg">
      {/* mobile hamburger toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3 z-50 hidden max-sm:flex h-10 w-10 items-center justify-center rounded-control border border-paper-line bg-paper-card text-ink shadow-sm"
      >
        <HiOutlineBars3 className="text-xl" />
      </button>

      {/* mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="ml-[236px] max-lg:ml-[62px] max-sm:ml-0">
        <Header />
        <main className="px-6 pb-10 pt-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
