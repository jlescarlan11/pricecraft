import React from 'react';
import { Calculator, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '../shared/Button';
import type { CalculationResult } from '../../types/calculator';
import { formatCurrency, getMarginColor } from '../../utils/formatters';

interface CalculatorSidePanelProps {
  results: CalculationResult | null;
  hasCommittedResults: boolean;
  isStale: boolean;
  isCalculating: boolean;
  onCalculate: () => void;
  onScrollToResults: () => void;
}

/**
 * Sticky right-rail summary used at xl+ breakpoints. Shows the live
 * calculation as the user edits, and a Calculate button to commit.
 */
export const CalculatorSidePanel: React.FC<CalculatorSidePanelProps> = ({
  results,
  hasCommittedResults,
  isStale,
  isCalculating,
  onCalculate,
  onScrollToResults,
}) => {
  const hasNumbers = !!results && results.costPerUnit > 0;

  return (
    <aside
      className="hidden xl:block sticky top-20 self-start"
      aria-label="Live calculation summary"
    >
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-clay" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-900">Live calculation</p>
          </div>
          {hasCommittedResults && isStale && (
            <span className="inline-flex items-center gap-1 text-2xs text-amber-700 font-medium">
              <RefreshCw className="w-3 h-3" />
              Stale
            </span>
          )}
        </div>

        {hasNumbers ? (
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className="label-caps">Recommended price</p>
              <p className="text-3xl font-serif text-ink-900 tnum mt-1">
                {formatCurrency(results.recommendedPrice)}
              </p>
              {results.priceWithVat !== undefined && (
                <p className="text-xs text-ink-500 mt-0.5 tnum">
                  +VAT: {formatCurrency(results.priceWithVat)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle">
              <div>
                <p className="label-caps">Cost / unit</p>
                <p className="text-sm font-medium text-ink-900 tnum mt-1">
                  {formatCurrency(results.costPerUnit)}
                </p>
              </div>
              <div>
                <p className="label-caps">Profit / unit</p>
                <p className="text-sm font-medium text-ink-900 tnum mt-1">
                  {formatCurrency(results.profitPerUnit)}
                </p>
              </div>
              <div>
                <p className="label-caps">Margin</p>
                <p
                  className={`text-sm font-semibold tnum mt-1 ${getMarginColor(
                    results.profitMarginPercent
                  )}`}
                >
                  {results.profitMarginPercent.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="label-caps">Break-even</p>
                <p className="text-sm font-medium text-ink-900 tnum mt-1">
                  {formatCurrency(results.breakEvenPrice)}
                </p>
              </div>
            </div>

            {results.wholesalePrice !== undefined && (
              <div className="pt-3 border-t border-border-subtle flex items-baseline justify-between">
                <p className="label-caps">Wholesale</p>
                <p className="text-sm font-medium text-ink-900 tnum">
                  {formatCurrency(results.wholesalePrice)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-ink-500">
              Fill in the form to see live numbers here.
            </p>
          </div>
        )}

        <div className="border-t border-border-subtle p-3 bg-surface/40 flex flex-col gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={onCalculate}
            isLoading={isCalculating}
            disabled={!hasNumbers}
            className="w-full"
          >
            {hasCommittedResults && !isStale ? 'Recalculate' : 'Calculate'}
          </Button>
          {hasCommittedResults && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onScrollToResults}
              className="w-full"
            >
              View full results
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
