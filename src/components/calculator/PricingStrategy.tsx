import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Card } from '../shared/Card';
import { Input } from '../shared/Input';
import { PricingExplainerModal } from '../help';
import { formatCurrency } from '../../utils/formatters';
import { calculateRecommendedPrice } from '../../utils/calculations';
import type { PricingStrategy as StrategyType } from '../../types/calculator';

interface PricingStrategyProps {
  strategy: StrategyType;
  value: number;
  costPerUnit: number;
  onChange: (strategy: StrategyType, value: number) => void;
  embedded?: boolean;
}

export const PricingStrategy: React.FC<PricingStrategyProps> = ({
  strategy,
  value,
  costPerUnit,
  onChange,
  embedded = false,
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleStrategyChange = (newStrategy: StrategyType) => {
    // When switching to margin, ensure value is within valid range (0-99.9)
    let newValue = value;
    if (newStrategy === 'margin' && value >= 100) {
      newValue = 25; // Default sensible margin
    }
    onChange(newStrategy, newValue);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    const validatedValue = strategy === 'margin' ? Math.min(99.9, newValue) : newValue;
    onChange(strategy, validatedValue);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(strategy, parseFloat(e.target.value));
  };

  const recommendedPrice = calculateRecommendedPrice(costPerUnit, strategy, value);
  const profit = recommendedPrice - costPerUnit;

  // Static example to help visualize
  const exampleCost = 100;
  const examplePrice = calculateRecommendedPrice(exampleCost, strategy, value);
  const exampleProfit = examplePrice - exampleCost;

  const content = (
    <div className="space-y-xl">
      {/* Strategy Selection - Tabs style */}
      <div className="flex p-xs bg-surface rounded-md border border-border-subtle">
        <button
          type="button"
          onClick={() => handleStrategyChange('markup')}
          className={`flex-1 py-sm text-sm font-medium rounded-md transition-all cursor-pointer ${
            strategy === 'markup'
              ? 'bg-clay text-white shadow-level-1'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          Markup
        </button>
        <button
          type="button"
          onClick={() => handleStrategyChange('margin')}
          className={`flex-1 py-sm text-sm font-medium rounded-md transition-all cursor-pointer ${
            strategy === 'margin'
              ? 'bg-clay text-white shadow-level-1'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          Margin
        </button>
      </div>

      {/* Visual Explanation - Hide in embedded mode if it's too much, or keep it. Keeping for now but maybe simplified. */}
      {!embedded && (
        <div className="bg-surface border border-border-subtle rounded-md p-lg transition-all duration-500">
          {strategy === 'markup' ? (
            <div className="space-y-sm">
              <p className="text-sm text-ink-900 font-medium">
                Add <span className="text-clay font-bold">{value}%</span> of the cost to your price.
              </p>
              <p className="text-xs text-ink-500 leading-relaxed">
                If your cost is {formatCurrency(exampleCost)}, adding {value}% markup results in a
                price of {formatCurrency(examplePrice)}(
                <span className="text-moss font-semibold">
                  {formatCurrency(exampleProfit)} profit
                </span>
                ).
              </p>
            </div>
          ) : (
            <div className="space-y-sm">
              <p className="text-sm text-ink-900 font-medium">
                Keep <span className="text-clay font-bold">{value}%</span> of the price as your
                profit.
              </p>
              <p className="text-xs text-ink-500 leading-relaxed">
                To earn a {value}% margin on a {formatCurrency(exampleCost)} cost, your price should
                be {formatCurrency(examplePrice)}(
                <span className="text-moss font-semibold">
                  {formatCurrency(exampleProfit)} profit
                </span>
                ).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Value Inputs */}
      <div className="space-y-lg">
        <Input
          label={`${strategy === 'markup' ? 'Markup' : 'Margin'} Percentage`}
          type="number"
          value={value}
          onChange={handleValueChange}
          suffix="%"
          min={0}
          max={strategy === 'margin' ? 99.9 : undefined}
          step="0.1"
        />

        <div className="space-y-sm px-xs">
          <input
            type="range"
            min="0"
            max={strategy === 'margin' ? '95' : '300'}
            step="1"
            value={value}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-border-subtle rounded-xs appearance-none cursor-pointer accent-clay"
          />
          <div className="flex justify-between text-[10px] text-ink-500 font-bold uppercase tracking-widest">
            <span>0%</span>
            <span>{strategy === 'margin' ? '95%' : '300%'}</span>
          </div>
        </div>
      </div>

      {/* Real-time Result - Hide if no cost per unit calculated */}
      {(!embedded || costPerUnit > 0) && (
        <div className="pt-4 border-t border-border-subtle">
          <div className="flex justify-between items-end gap-3">
            <div>
              <p className="label-caps">Recommended price</p>
              <p className="text-2xl font-semibold text-ink-900 tracking-tight tnum mt-1">
                {formatCurrency(recommendedPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="label-caps">Profit per unit</p>
              <p className="text-base font-semibold text-moss-700 tnum mt-1">
                +{formatCurrency(profit)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <h4 className="label-caps">Pricing strategy</h4>
        {content}
      </div>
    );
  }

  return (
    <Card
      title={
        <div className="flex flex-wrap items-center justify-between gap-y-sm w-full">
          <h3 className="text-lg text-ink-900 leading-tight">Pricing Strategy</h3>
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="text-clay hover:text-clay/80 flex items-center gap-sm text-sm font-medium transition-colors group shrink-0"
            aria-label="Help with pricing strategies"
          >
            <HelpCircle className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
            <span className="whitespace-nowrap">Learn More</span>
          </button>
        </div>
      }
    >
      {content}

      <PricingExplainerModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTab={strategy}
      />
    </Card>
  );
};
