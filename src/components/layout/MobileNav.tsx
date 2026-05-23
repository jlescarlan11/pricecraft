import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calculator,
  BookOpen,
  ScanLine,
  Receipt,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  onMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onMenu }) => {
  const { user } = useAuth();

  const itemClass = ({ isActive }: { isActive: boolean }): string =>
    [
      'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-md transition-colors flex-1 min-w-0',
      isActive ? 'text-clay' : 'text-ink-500',
    ].join(' ');

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-bg-elevated border-t border-border-subtle pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-14 px-1">
        <NavLink to="/" end className={itemClass}>
          <Calculator className="w-5 h-5" />
          <span className="text-2xs">Calculator</span>
        </NavLink>
        {user && (
          <NavLink to="/catalog" className={itemClass}>
            <BookOpen className="w-5 h-5" />
            <span className="text-2xs">Catalog</span>
          </NavLink>
        )}
        {user && (
          <NavLink to="/scan-receipt" className={itemClass}>
            <ScanLine className="w-5 h-5" />
            <span className="text-2xs">Scan</span>
          </NavLink>
        )}
        {user && (
          <NavLink to="/sales" className={itemClass}>
            <Receipt className="w-5 h-5" />
            <span className="text-2xs">Sales</span>
          </NavLink>
        )}
        <button
          type="button"
          onClick={onMenu}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-md text-ink-500 hover:text-ink-900 flex-1"
          aria-label="More"
        >
          <Menu className="w-5 h-5" />
          <span className="text-2xs">More</span>
        </button>
      </div>
    </nav>
  );
};
