import React from 'react';
import { ChevronRight, CircleDot, RefreshCw } from 'lucide-react';
import { Button } from '../shared/Button';
import type { CalculationResult } from '../../types/calculator';
import { formatCurrency } from '../../utils/formatters';

interface CalculatorSidePanelProps {
  results: CalculationResult | null;
  hasCommittedResults: boolean;
  isStale: boolean;
  isCalculating: boolean;
  onCalculate: () => void;
  onScrollToResults: () => void;
}

/** Persistent decision surface for the calculator workspace. */
export const CalculatorSidePanel: React.FC<CalculatorSidePanelProps> = ({
  results,
  hasCommittedResults,
  isStale,
  isCalculating,
  onCalculate,
  onScrollToResults,
}) => {
  const hasNumbers = !!results && results.costPerUnit > 0;
  const totalCost = results?.totalCost || 0;
  const composition = results
    ? [
        ['Ingredients', results.breakdown.ingredients],
        ['Labor', results.breakdown.labor],
        ['Overhead', results.breakdown.overhead],
        ['Packaging', results.breakdown.packaging || 0],
      ].filter(([, value]) => Number(value) > 0)
    : [];

  return (
    <aside
      className="hidden xl:block sticky top-[76px] self-start min-w-0"
      aria-label="Price runway"
    >
      <div className="bg-sidebar text-white border border-black overflow-hidden">
        <div className="px-5 py-4 border-b border-white/15 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/60">
            Price runway
          </p>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/55">
            {hasCommittedResults && isStale ? (
              <RefreshCw className="w-3 h-3 text-signal" aria-hidden="true" />
            ) : (
              <CircleDot className="w-3 h-3 text-signal" aria-hidden="true" />
            )}
            {hasCommittedResults && isStale ? 'Changed' : 'Live'}
          </span>
        </div>

        <div className="px-5 py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
            Recommended selling price
          </p>
          <p
            key={results?.recommendedPrice || 0}
            className="mt-3 font-mono text-[clamp(2.9rem,4vw,4.6rem)] leading-none tracking-[-0.07em] text-signal tnum animate-pulse-once"
          >
            {hasNumbers ? formatCurrency(results.recommendedPrice) : '₱—'}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 border border-white/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white/70">
            <span className="w-1.5 h-1.5 bg-signal" aria-hidden="true" />
            {hasNumbers
              ? results.profitMarginPercent >= 25
                ? 'Healthy margin'
                : 'Review margin'
              : 'Awaiting costs'}
          </p>
        </div>

        {hasNumbers ? (
          <>
            <dl className="border-y border-white/15 divide-y divide-white/10 px-5">
              <RunwayMetric label="Break-even price" value={formatCurrency(results.breakEvenPrice)} />
              <RunwayMetric label="Profit per unit" value={formatCurrency(results.profitPerUnit)} />
              <RunwayMetric
                label="Profit margin"
                value={`${results.profitMarginPercent.toFixed(2)}%`}
                highlighted
              />
              <RunwayMetric label="Total batch profit" value={formatCurrency(results.profitPerBatch)} />
              {results.wholesalePrice !== undefined && (
                <RunwayMetric label="Wholesale price" value={formatCurrency(results.wholesalePrice)} />
              )}
            </dl>

            <div className="px-5 py-5 border-b border-white/15">
              <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/40 mb-4">
                Cost composition
              </p>
              <div className="space-y-3">
                {composition.map(([label, rawValue]) => {
                  const value = Number(rawValue);
                  const percent = totalCost > 0 ? (value / totalCost) * 100 : 0;
                  return (
                    <div key={String(label)}>
                      <div className="flex items-baseline justify-between gap-3 font-mono text-[10px]">
                        <span className="text-white/55">{label}</span>
                        <span className="text-white/85 tnum">
                          {percent.toFixed(1)}% · {formatCurrency(value)}
                        </span>
                      </div>
                      <div className="h-px bg-white/15 mt-2">
                        <div className="h-px bg-signal" style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-white/15 flex items-baseline justify-between font-mono">
                <span className="text-[9px] uppercase tracking-[0.12em] text-white/45">Total cost</span>
                <span className="text-sm tnum">{formatCurrency(totalCost)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="px-5 py-10 border-y border-white/15">
            <p className="font-serif text-2xl leading-tight text-white">Build the cost picture.</p>
            <p className="text-sm text-white/45 mt-3 leading-relaxed">
              Add the product, ingredient and operating costs to unlock a live recommendation.
            </p>
          </div>
        )}

        <div className="p-5 flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onCalculate}
            isLoading={isCalculating}
            disabled={!hasNumbers}
            className="w-full bg-signal text-black border-signal hover:bg-signal-strong hover:text-black"
          >
            {hasCommittedResults && !isStale ? 'Recommit price' : 'Commit price'}
          </Button>
          {hasCommittedResults && (
            <Button
              variant="secondary"
              size="md"
              onClick={onScrollToResults}
              className="w-full border-white/35 text-white hover:bg-white hover:text-black"
            >
              Open decision report
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

const RunwayMetric: React.FC<{
  label: string;
  value: string;
  highlighted?: boolean;
}> = ({ label, value, highlighted = false }) => (
  <div className="flex items-baseline justify-between gap-4 py-3 font-mono">
    <dt className="text-[9px] uppercase tracking-[0.1em] text-white/45">{label}</dt>
    <dd className={`text-sm tnum ${highlighted ? 'text-signal' : 'text-white'}`}>{value}</dd>
  </div>
);
