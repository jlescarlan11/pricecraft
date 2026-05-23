import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) => {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      />
      <div
        className="
          relative w-9 h-5 bg-border-base rounded-full transition-colors duration-150
          peer-checked:bg-clay
          peer-focus-visible:shadow-[var(--shadow-focus)]
          after:content-[''] after:absolute after:top-0.5 after:left-0.5
          after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-level-1
          after:transition-transform after:duration-150
          peer-checked:after:translate-x-4
        "
      />
      {label && (
        <span className="text-sm text-ink-700 select-none">{label}</span>
      )}
    </label>
  );
};
