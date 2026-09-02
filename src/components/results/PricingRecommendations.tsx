import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Badge } from '../shared/Badge';
import type { BadgeVariant } from '../shared/Badge';
import type { CalculationResult } from '../../types/calculator';
import { formatCurrency, formatPercent } from '../../utils/formatters';

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
    const color = margin < 15 ? 'rust' : margin <= 25 ? 'clay' : 'moss';
    
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
    <div className={`bg-sidebar text-white border border-black ${className}`}>
      <div className="px-5 sm:px-7 py-7 sm:py-9 border-b border-white/15">
        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-white/45">
          Recommended selling price
        </p>
        <p
          key={recommendedPrice}
          className="font-mono text-5xl sm:text-7xl text-signal tracking-[-0.07em] leading-none tnum animate-pulse-once mt-3"
        >
          {formatCurrency(recommendedPrice)}
        </p>
        <div className="mt-5">
          <Badge
            variant={badgeDetails.variant}
            className="py-1 px-2 flex items-center justify-center bg-transparent border-white/25 text-white"
          >
            {badgeDetails.icon}
            {badgeDetails.label}
          </Badge>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2">
        <RecommendationMetric label="Break-even price" value={formatCurrency(breakEvenPrice)} />
        <RecommendationMetric
          label="Profit margin"
          value={formatPercent(profitMarginPercent)}
          signal
        />
        <RecommendationMetric label="Profit per unit" value={formatCurrency(profitPerUnit)} />
        <RecommendationMetric label="Total batch profit" value={formatCurrency(profitPerBatch)} />
      </dl>
    </div>
  );
};

const RecommendationMetric: React.FC<{
  label: string;
  value: string;
  signal?: boolean;
}> = ({ label, value, signal = false }) => (
  <div className="px-5 sm:px-6 py-4 border-b border-r border-white/15 last:border-r-0">
    <dt className="font-mono text-[9px] uppercase tracking-[0.11em] text-white/40">{label}</dt>
    <dd className={`font-mono text-lg mt-2 tnum ${signal ? 'text-signal' : 'text-white'}`}>{value}</dd>
  </div>
);
