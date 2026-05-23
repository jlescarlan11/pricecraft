import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PriceComparisonProps {
  currentPrice: number | undefined;
  recommendedPrice: number;
  costPerUnit: number;
  batchSize: number;
  className?: string;
}

/**
 * Compares the user's current selling price with the recommended price.
 * Renders only when currentPrice is provided.
 */
export const PriceComparison: React.FC<PriceComparisonProps> = ({
  currentPrice,
  recommendedPrice,
  costPerUnit,
  batchSize,
  className = '',
}) => {
  // Only render if a valid current selling price is provided
  if (!currentPrice || currentPrice <= 0) {
    return null;
  }

  const diff = currentPrice - recommendedPrice;
  const absDiff = Math.abs(diff);
  const isHigher = diff > 0.01; // Using a small epsilon for float comparison
  const isLower = diff < -0.01;

  const currentProfitPerUnit = currentPrice - costPerUnit;
  const currentProfitPerBatch = currentProfitPerUnit * batchSize;

  let statusMessage = '';
  let statusIcon = null;
  let statusColor = '';

  if (isLower) {
    statusMessage = `There's an opportunity for ${formatCurrency(absDiff)} more per unit`;
    statusIcon = <TrendingUp className="w-5 h-5 shrink-0" />;
    statusColor = 'text-ink-900 bg-sakura/10 border-sakura/20';
  } else if (isHigher) {
    statusMessage = `Your price is ${formatCurrency(absDiff)} higher than the recommendation`;
    statusIcon = <TrendingDown className="w-5 h-5 shrink-0" />;
    statusColor = 'text-rust bg-rust/5 border-rust/10';
  } else {
    statusMessage = 'Your pricing is perfectly aligned';
    statusIcon = <CheckCircle className="w-5 h-5 shrink-0" />;
    statusColor = 'text-moss bg-moss/5 border-moss/10';
  }

  return (
    <div className={`space-y-xl ${className}`}>
      <h3 className="text-base font-semibold text-ink-900">Comparison</h3>

      <div className="space-y-lg">
        {/* Visual Comparison */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-lg p-xl bg-surface rounded-xl border border-border-subtle">
          <div className="text-center sm:text-left flex-1">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest mb-xs">
              Current Price
            </p>
            <p className="text-3xl font-bold text-ink-900 tracking-tight tabular-nums">
              {formatCurrency(currentPrice)}
            </p>
          </div>

          <div className="hidden sm:flex items-center justify-center">
            <ArrowRight className="w-8 h-8 text-border-base" />
          </div>

          <div className="text-center sm:text-right flex-1">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest mb-xs">
              Recommended
            </p>
            <p className="text-3xl font-bold text-clay tracking-tight tabular-nums">
              {formatCurrency(recommendedPrice)}
            </p>
          </div>
        </div>

        {/* Opportunity Cost Message */}
        <div
          className={`p-lg rounded-xl flex items-center gap-md transition-all duration-500 ${statusColor.replace('border', 'no-border')}`}
        >
          <div className="p-sm bg-white/50 rounded-sm shadow-level-1">{statusIcon}</div>
          <span className="font-bold text-sm sm:text-base tracking-tight">{statusMessage}</span>
        </div>

        {/* Profitability at Current Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-xl">
          <div className="flex justify-between items-center py-sm">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest">
              Current Profit / Unit
            </p>
            <p
              className={`text-xl font-bold tabular-nums ${currentProfitPerUnit >= 0 ? 'text-moss' : 'text-rust'}`}
            >
              {formatCurrency(currentProfitPerUnit)}
            </p>
          </div>

          <div className="flex justify-between items-center py-sm">
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest">
              Current Profit / Batch
            </p>
            <p
              className={`text-xl font-bold tabular-nums ${currentProfitPerBatch >= 0 ? 'text-moss' : 'text-rust'}`}
            >
              {formatCurrency(currentProfitPerBatch)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
