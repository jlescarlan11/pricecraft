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
    'bg-bg-elevated rounded-none border border-border-base shadow-none overflow-hidden relative transition-colors duration-150';
  const interactiveClasses = interactive
    ? 'hover:bg-surface hover:border-ink-900 cursor-pointer'
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
            <div className="border-t border-border-base bg-surface/60 px-4 sm:px-5 py-3 text-sm">
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
