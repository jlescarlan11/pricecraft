import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Compact status pill used across the app. Semantic variants map to the
 * design tokens: success → moss, warning → amber, error → rust,
 * info → clay, neutral → slate.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className = '',
}) => {
  const baseStyles =
    'inline-flex items-center rounded-none px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] font-medium leading-tight transition-colors';

  const variants: Record<BadgeVariant, string> = {
    success: 'bg-moss-50 text-moss-700 border border-moss-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    error: 'bg-rust-50 text-rust-700 border border-rust-100',
    info: 'bg-clay-50 text-clay-700 border border-clay-100',
    neutral: 'bg-slate-50 text-slate-700 border border-slate-100',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
