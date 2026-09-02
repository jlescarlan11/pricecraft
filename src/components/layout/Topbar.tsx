import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight } from 'lucide-react';

interface TopbarProps {
  onMenu: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Calculator',
  '/catalog': 'Ingredient catalog',
  '/scan-receipt': 'Scan receipt',
  '/planner': 'Batch planner',
  '/sales': 'Sales log',
  '/drift': 'Price drift',
  '/pricing-sheet': 'Pricing sheet',
  '/settings': 'Settings',
  '/account': 'Account',
  '/faq': 'Pricing tips',
  '/auth': 'Sign in',
};

export const Topbar: React.FC<TopbarProps> = ({ onMenu }) => {
  const location = useLocation();
  const title = ROUTE_TITLES[location.pathname] || '';

  return (
    <header
      className="sticky top-0 z-20 bg-bg-main text-ink-900 border-b border-border-subtle"
      role="banner"
    >
      <div className="h-14 px-4 lg:px-6 flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenu}
          className="lg:hidden -ml-1 p-2 rounded-none text-ink-600 hover:text-signal hover:bg-surface"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / title */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to="/"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-900 hidden sm:inline"
          >
            PriceCraft
          </Link>
          {title && (
            <>
              <ChevronRight
                className="w-3.5 h-3.5 text-ink-300 hidden sm:inline"
                aria-hidden="true"
              />
              <span className="text-sm text-ink-900 font-medium truncate">
                {title}
              </span>
            </>
          )}
        </div>

        <div className="flex-1" />
      </div>
    </header>
  );
};
