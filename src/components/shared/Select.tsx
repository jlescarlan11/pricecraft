import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  hideLabel?: boolean;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  hideLabel = false,
  value,
  onChange,
  options,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  placeholder,
  ...props
}) => {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className={`flex flex-col gap-xs w-full ${className}`}>
      <label
        htmlFor={id}
        className={`text-sm font-medium text-ink-700 flex items-center justify-between mb-1 ${hideLabel ? 'sr-only' : ''}`}
      >
        <span>
          {label}
          {required && (
            <span className="text-rust ml-1" aria-hidden="true">
              *
            </span>
          )}
        </span>
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`
            block w-full rounded-md border appearance-none
            h-9 pl-3 pr-8 text-sm transition-colors duration-150
            disabled:bg-surface disabled:text-ink-400 disabled:cursor-not-allowed
            focus-visible:outline-none focus:shadow-[var(--shadow-focus)]
            ${
              error
                ? 'border-rust text-rust focus:border-rust'
                : 'border-border-base bg-bg-elevated text-ink-900 focus:border-clay'
            }
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown
            className={`h-4 w-4 ${error ? 'text-rust' : 'text-ink-400'}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {error ? (
        <p
          className="mt-1 text-xs text-rust flex items-center gap-1"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-ink-500" id={helperId}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
