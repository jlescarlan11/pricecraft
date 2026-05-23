import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from '../shared/Badge';
import type { BadgeVariant } from '../shared/Badge';
import type { CalculationResult } from '../../types/calculator';
import { formatCurrency, formatPercent, getMarginColor } from '../../utils/formatters';

interface PricingRecommendationsProps {
  results: CalculationResult;
  className?: string;
}

/**
 * Displays key pricing metrics and recommendations based on calculation results.
 * Features a color-coded profit margin indicator and prominent selling price.
 */
export const PricingRecommendations: React.FC<PricingRecommendationsProps> = ({
  results,
  className = '',
}) => {
  const { breakEvenPrice, recommendedPrice, profitPerUnit, profitPerBatch, profitMarginPercent } =
    results;

  const getMarginBadge = (
    margin: number
  ): { variant: BadgeVariant; label: string; icon: React.ReactNode } => {
    const color = getMarginColor(margin);
    
    if (color === 'rust') {
      return {
        variant: 'error',
        label: 'Tight margin',
        icon: <AlertCircle className="w-3 h-3 mr-1" />,
      };
    }
    if (color === 'clay') {
      return {
        variant: 'info',
        label: 'Modest margin',
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
      };
    }
    return {
      variant: 'success',
      label: 'Healthy margin',
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
    };
  };

  const badgeDetails = getMarginBadge(profitMarginPercent);

  return (
    <div className={`space-y-2xl ${className}`}>
      {/* Recommended Selling Price - Primary Focus */}
      <div className="flex flex-col items-center px-6 py-8 bg-bg-elevated rounded-xl border border-border-subtle shadow-level-1 relative overflow-hidden">
        <div className="relative z-10 w-full text-center">
          <p className="label-caps mb-2">Recommended selling price</p>
          <p
            key={recommendedPrice}
            className="font-serif text-5xl sm:text-6xl text-ink-900 tracking-tight tnum animate-pulse-once"
          >
            {formatCurrency(recommendedPrice)}
          </p>
          <div className="flex justify-center mt-4">
            <Badge
              variant={badgeDetails.variant}
              className="py-1.5 px-4 text-sm flex items-center justify-center shadow-sm"
            >
              {badgeDetails.icon}
              {badgeDetails.label}
            </Badge>
          </div>
        </div>
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-clay/5 rounded-round -mr-24 -mt-24 blur-3xl transition-opacity group-hover:opacity-100 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-moss/5 rounded-round -ml-16 -mb-16 blur-2xl transition-opacity group-hover:opacity-100 opacity-30" />
      </div>

      {/* Secondary Metrics - Clean List/Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3xl gap-y-xl opacity-90 group-hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-center group/item py-sm">
          <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">
            Break-even Price
          </p>
          <p className="text-xl font-bold text-ink-900 tabular-nums">
            {formatCurrency(breakEvenPrice)}
          </p>
        </div>

        <div className="flex justify-between items-center group/item py-sm">
          <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">
            Profit Margin
          </p>
          <p className={`text-xl font-bold tabular-nums text-${getMarginColor(profitMarginPercent)}`}>
            {formatPercent(profitMarginPercent)}
          </p>
        </div>

        <div className="flex justify-between items-center group/item py-sm">
          <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">
            Profit Per Unit
          </p>
          <p className="text-xl font-bold text-moss tabular-nums">
            {formatCurrency(profitPerUnit)}
          </p>
        </div>

        <div className="flex justify-between items-center group/item py-sm">
          <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">
            Total Batch Profit
          </p>
          <p className="text-xl font-bold text-moss tabular-nums">
            {formatCurrency(profitPerBatch)}
          </p>
        </div>
      </div>
    </div>
  );
};
