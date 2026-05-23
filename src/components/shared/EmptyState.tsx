import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty-state for lists, tables, and panels. Dashed border on
 * elevated surface with an optional icon, title, description, and action.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg border border-dashed border-border-base bg-bg-elevated ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-ink-400 mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {description && (
        <p className="text-sm text-ink-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
