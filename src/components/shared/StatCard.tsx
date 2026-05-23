import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export type StatTone = 'neutral' | 'positive' | 'negative' | 'warn';

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  /** Optional delta indicator like +12.4% */
  delta?: number;
  icon?: React.ReactNode;
}

const toneText: Record<StatTone, string> = {
  neutral: 'text-ink-900',
  positive: 'text-moss-700',
  negative: 'text-rust-700',
  warn: 'text-amber-700',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  tone = 'neutral',
  delta,
  icon,
}) => {
  return (
    <div className="card p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="label-caps text-ink-500">{label}</p>
        {icon && <div className="text-ink-300">{icon}</div>}
      </div>
      <p className={`mt-2 text-2xl font-semibold tnum ${toneText[tone]}`}>
        {value}
      </p>
      {(hint || delta !== undefined) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span
              className={[
                'inline-flex items-center font-medium',
                delta >= 0 ? 'text-moss-700' : 'text-rust-700',
              ].join(' ')}
            >
              {delta >= 0 ? (
                <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
              )}
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-ink-400">{hint}</span>}
        </div>
      )}
    </div>
  );
};
