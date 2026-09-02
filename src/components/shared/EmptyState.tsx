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
      className={`flex flex-col items-start justify-center text-left py-14 px-6 rounded-none border-y border-border-base bg-transparent ${className}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-none bg-sidebar flex items-center justify-center text-signal mb-5">
          {icon}
        </div>
      )}
      <p className="font-serif text-3xl leading-none text-ink-900">{title}</p>
      {description && (
        <p className="text-sm text-ink-500 mt-3 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
