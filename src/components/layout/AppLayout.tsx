import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer on any route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when the drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh bg-bg-main app-shell">
      {/* Desktop sidebar — fixed */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[220px] z-30">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-ink-900/40 animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Only mount the mobile dialog while open so hidden navigation is not
          exposed to assistive technology. */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-y-0 left-0 z-50 w-[min(320px,88vw)] animate-in slide-in-from-left duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="h-full relative">
            <Sidebar onItemClick={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-none text-ink-500 hover:text-signal hover:bg-surface"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-[220px] min-h-dvh bg-bg-main">
        <Topbar onMenu={() => setMobileOpen(true)} />

        <main className="focus:outline-none min-h-[calc(100dvh-3.5rem)] bg-bg-main">
          <div className="px-4 sm:px-6 lg:px-7 2xl:px-9 py-5 lg:py-7 pb-24 lg:pb-10 max-w-[1680px] mx-auto app-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
