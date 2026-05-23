import React, { useId } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  hideLabel?: boolean;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  helperText?: string;
  currency?: boolean;
  suffix?: string;
  tooltip?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hideLabel = false,
      value,
      onChange,
      type = 'text',
      error,
      helperText,
      required = false,
      placeholder,
      disabled = false,
      currency = false,
      suffix,
      tooltip,
      className = '',
      ...props
    },
    ref
  ) => {
    const id = useId();
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const describedBy = error ? errorId : helperText ? helperId : undefined;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent typing negative sign for number inputs
      if (type === 'number' && e.key === '-') {
        e.preventDefault();
      }
    };

    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <div className={`flex items-center justify-between mb-2 ${hideLabel ? 'sr-only' : ''}`}>
            <label
              htmlFor={id}
              className="text-sm font-medium text-ink-700 flex items-center gap-xs tracking-[0.01em]"
            >
              <span>
                {label}
                {required && (
                  <span className="text-rust ml-xs" aria-hidden="true">
                    *
                  </span>
                )}
              </span>
              {tooltip && (
                <Tooltip content={tooltip}>
                  <button
                    type="button"
                    className="text-ink-500 hover:text-clay cursor-help transition-colors p-0.5"
                    aria-label={`More info about ${label}`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              )}
            </label>
          </div>
        )}

        <div className="relative">
          {currency && (
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <span className="text-ink-400 text-sm">₱</span>
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            onKeyDown={handleKeyDown}
            min={type === 'number' ? 0 : undefined}
            inputMode={type === 'number' ? 'decimal' : undefined}
            className={`
            block w-full rounded-md border tnum text-sm
            h-9 transition-colors duration-150
            disabled:bg-surface disabled:text-ink-400 disabled:cursor-not-allowed
            focus-visible:outline-none focus:shadow-[var(--shadow-focus)]
            placeholder:text-ink-400
            ${currency ? 'pl-7' : 'pl-3'}
            ${suffix || error ? 'pr-9' : 'pr-3'}
            ${
              error
                ? 'border-rust text-rust placeholder-rust/40 focus:border-rust'
                : 'border-border-base bg-bg-elevated text-ink-900 focus:border-clay'
            }
          `}
            {...props}
          />

          {suffix && !error && (
            <div className="absolute inset-y-0 right-0 pr-sm flex items-center pointer-events-none">
              <span className="text-ink-500 sm:text-sm">{suffix}</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-y-0 right-0 pr-sm flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-rust" aria-hidden="true" />
            </div>
          )}
        </div>

        {error ? (
          <p
            className="mt-xs text-[12px] text-rust flex items-center gap-xs"
            id={errorId}
            role="alert"
          >
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-xs text-[12px] text-ink-500" id={helperId}>
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
