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
      className="sticky top-0 z-20 bg-bg-main/95 backdrop-blur supports-[backdrop-filter]:bg-bg-main/80 border-b border-border-subtle"
      role="banner"
    >
      <div className="h-14 px-4 lg:px-6 flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenu}
          className="lg:hidden -ml-1 p-2 rounded-md text-ink-700 hover:bg-surface"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / title */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to="/"
            className="text-sm text-ink-400 hover:text-ink-700 hidden sm:inline"
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

        {/* Slot for actions per page (future) */}
      </div>
    </header>
  );
};
