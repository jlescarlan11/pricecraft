import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'ghost'
  | 'soft'
  | 'dashed';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  dashed?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  dashed = false,
  disabled,
  type = 'button',
  ...props
}) => {
  // Business-grade button: tighter padding, subtle shadows, no scale-on-hover
  // (that's a consumer pattern). Focus ring uses our shadow-focus token.
  const baseStyles = [
    'inline-flex items-center justify-center gap-1.5',
    'rounded-md font-medium whitespace-nowrap',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer select-none',
  ].join(' ');

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-clay text-white border border-clay hover:bg-clay-600',
    secondary:
      'bg-bg-elevated text-ink-900 border border-border-base hover:bg-surface hover:border-border-strong',
    success: 'bg-moss text-white border border-moss hover:bg-moss-700',
    danger: 'bg-rust text-white border border-rust hover:bg-rust-700',
    ghost: 'text-ink-700 hover:text-ink-900 hover:bg-surface border border-transparent',
    soft: 'bg-moss-50 text-moss-700 border border-moss-100 hover:bg-moss-100',
    dashed:
      'bg-transparent text-ink-500 border-2 border-dashed border-border-base hover:border-clay hover:text-clay hover:bg-clay-50',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-11 px-4 text-sm',
  };

  const variantStyles = dashed ? variants.dashed : variants[variant];
  const sizeStyles = sizes[size];

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="-ml-0.5 mr-1 h-3.5 w-3.5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
