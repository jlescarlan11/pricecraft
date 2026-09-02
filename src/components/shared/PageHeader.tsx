import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-side actions (buttons, etc.) */
  actions?: React.ReactNode;
  /** Optional eyebrow caps-label (e.g. "WORKSPACE"). */
  eyebrow?: React.ReactNode;
  /** Optional content below the title row but above the divider (e.g. tabs). */
  children?: React.ReactNode;
  /** Hide the bottom divider — useful when the page renders its own. */
  bare?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  eyebrow,
  children,
  bare = false,
}) => {
  return (
    <header
      className={[
        'mb-7 lg:mb-9',
        bare ? '' : 'pb-6 border-b border-border-base',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="label-caps mb-2">{eyebrow}</p>
          )}
          <h1 className="text-4xl lg:text-5xl text-ink-900 font-normal tracking-[-0.04em] font-serif leading-[0.98]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-sm text-ink-500 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
};
