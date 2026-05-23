import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  BookOpen,
  ScanLine,
  ClipboardList,
  Receipt,
  Printer,
  TrendingUp,
  Settings as SettingsIcon,
  User,
  LogIn,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  authOnly?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: '/', label: 'Calculator', icon: Calculator },
  { to: '/catalog', label: 'Catalog', icon: BookOpen, authOnly: true },
  { to: '/scan-receipt', label: 'Scan receipt', icon: ScanLine, authOnly: true },
  { to: '/planner', label: 'Planner', icon: ClipboardList, authOnly: true },
  { to: '/sales', label: 'Sales', icon: Receipt, authOnly: true },
  { to: '/drift', label: 'Price drift', icon: TrendingUp, authOnly: true },
  { to: '/pricing-sheet', label: 'Pricing sheet', icon: Printer, authOnly: true },
];

const SECONDARY: NavItem[] = [
  { to: '/faq', label: 'Pricing tips', icon: HelpCircle },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

interface SidebarProps {
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    [
      'group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
      'hover:bg-surface',
      isActive
        ? 'bg-surface text-ink-900 font-medium'
        : 'text-ink-500 hover:text-ink-900',
    ].join(' ');

  const renderItem = (item: NavItem) => {
    if (item.authOnly && !user) return null;
    const Icon = item.icon;
    return (
      <li key={item.to}>
        <NavLink to={item.to} className={linkClass} end onClick={onItemClick}>
          {({ isActive }) => (
            <>
              <Icon
                className={[
                  'w-4 h-4 shrink-0',
                  isActive ? 'text-clay' : 'text-ink-400 group-hover:text-ink-700',
                ].join(' ')}
              />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <aside className="h-full flex flex-col bg-bg-elevated border-r border-border-subtle">
      {/* Logo + brand — matches topbar height (h-14 = 56px) */}
      <div className="h-14 px-4 border-b border-border-subtle flex items-center">
        <Link
          to="/"
          className="flex items-center gap-2.5 group min-w-0"
          onClick={onItemClick}
        >
          <div className="w-7 h-7 rounded-md bg-clay text-white flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-serif text-base text-ink-900 font-semibold truncate">
              PriceCraft
            </span>
            <span className="text-2xs uppercase tracking-caps text-ink-400 mt-0.5 truncate">
              Mindful pricing
            </span>
          </div>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <p className="label-caps px-3 mb-2">Workspace</p>
        <ul className="space-y-0.5">{PRIMARY.map(renderItem)}</ul>

        <p className="label-caps px-3 mt-6 mb-2">More</p>
        <ul className="space-y-0.5">{SECONDARY.map(renderItem)}</ul>
      </nav>

      {/* Footer / user */}
      <div className="px-2 py-3 border-t border-border-subtle">
        {user ? (
          <NavLink
            to="/account"
            className={linkClass}
            onClick={onItemClick}
          >
            <User className="w-4 h-4 text-ink-400" />
            <div className="flex flex-col leading-tight overflow-hidden min-w-0">
              <span className="truncate text-ink-900 font-medium text-sm">
                {user.email?.split('@')[0]}
              </span>
              <span className="truncate text-2xs text-ink-400">
                {user.email}
              </span>
            </div>
          </NavLink>
        ) : (
          <NavLink to="/auth" className={linkClass} onClick={onItemClick}>
            <LogIn className="w-4 h-4 text-ink-400" />
            <span>Sign in</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
