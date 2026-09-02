import React from 'react';
import { LoaderCircle } from 'lucide-react';

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
  // Editorial controls stay square and rely on contrast instead of decoration.
  const baseStyles = [
    'inline-flex items-center justify-center gap-1.5',
    'rounded-none font-medium whitespace-nowrap',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer select-none',
  ].join(' ');

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-sidebar text-white border border-sidebar hover:bg-graphite',
    secondary:
      'bg-transparent text-ink-900 border border-border-strong hover:bg-ink-900 hover:text-white hover:border-ink-900',
    success: 'bg-ink-900 text-white border border-ink-900 hover:bg-moss-700',
    danger: 'bg-rust-700 text-white border border-rust-700 hover:bg-rust',
    ghost: 'text-ink-600 hover:text-ink-900 hover:bg-surface border border-transparent',
    soft: 'bg-surface text-ink-900 border border-border-base hover:bg-surface-hover',
    dashed:
      'bg-transparent text-ink-600 border border-dashed border-border-strong hover:border-ink-900 hover:text-ink-900 hover:bg-surface',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-sm',
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
        <LoaderCircle className="-ml-0.5 mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
};
