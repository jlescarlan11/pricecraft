import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  noPadding?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  footer,
  noPadding = false,
  interactive = false,
}) => {
  const baseClasses =
    'bg-bg-elevated rounded-lg border border-border-subtle shadow-level-1 overflow-hidden relative transition-shadow duration-150';
  const interactiveClasses = interactive
    ? 'hover:shadow-level-2 hover:border-border-base cursor-pointer'
    : '';

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${className}`}>
      {noPadding ? (
        <>
          {title && (
            <div className="p-4 sm:p-5 pb-0">
              {typeof title === 'string' ? (
                <h3 className="text-sm font-semibold text-ink-900 mb-3">{title}</h3>
              ) : (
                title
              )}
            </div>
          )}
          {children}
          {footer && (
            <div className="border-t border-border-subtle bg-surface/40 px-4 sm:px-5 py-3 text-sm">
              {footer}
            </div>
          )}
        </>
      ) : (
        <div className="p-4 sm:p-5">
          {title && (
            <div className="mb-4">
              {typeof title === 'string' ? (
                <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
              ) : (
                title
              )}
            </div>
          )}

          {children}

          {footer && (
            <div className="mt-4 pt-4 border-t border-border-subtle text-sm text-ink-500">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
