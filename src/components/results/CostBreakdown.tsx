import React from 'react';
import type { CalculationResult } from '../../types/calculator';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../shared/Card';

interface CostBreakdownProps {
  results: CalculationResult;
  className?: string;
}

export const CostBreakdown: React.FC<CostBreakdownProps> = ({ results, className }) => {
  const { totalCost, costPerUnit, breakdown, variantResults, profitPerBatch } = results;
  const hasVariants = variantResults && variantResults.length > 0;

  // 1. Simple View (No Variants)
  if (!hasVariants) {
    const categories = [
      { label: 'Ingredients', value: breakdown.ingredients },
      { label: 'Labor', value: breakdown.labor },
      { label: 'Overhead', value: breakdown.overhead },
    ];

    return (
      <Card title="Cost analysis" className={className}>
        <ul className="divide-y divide-border-subtle text-sm">
          {categories.map((category) => (
            <li
              key={category.label}
              className="flex items-center justify-between py-2"
            >
              <span className="text-ink-700">{category.label}</span>
              <span className="font-medium text-ink-900 tnum">
                {formatCurrency(category.value)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-md surface-inset p-3">
          <div className="flex items-center justify-between">
            <span className="label-caps">Total batch cost</span>
            <span className="text-lg font-semibold text-ink-900 tnum">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
            <span className="label-caps">Cost per unit</span>
            <span className="text-base font-semibold text-clay tnum">
              {formatCurrency(costPerUnit)}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // 2. Variant View (Detailed Breakdown)
  return (
    <div className={`space-y-4 ${className}`}>
      <Card title="Batch summary">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label-caps">Total batch cost</p>
            <p className="text-xl font-semibold text-ink-900 tnum mt-1">
              {formatCurrency(totalCost)}
            </p>
          </div>
          <div>
            <p className="label-caps">Total expected profit</p>
            <p className="text-xl font-semibold text-moss-700 tnum mt-1">
              {formatCurrency(profitPerBatch)}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Cost per variant" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-surface/60 border-b border-border-subtle text-left">
                <th className="px-4 py-2.5 label-caps">Variant</th>
                <th className="px-4 py-2.5 label-caps text-right">Base alloc.</th>
                <th className="px-4 py-2.5 label-caps text-right">Add-ons</th>
                <th className="px-4 py-2.5 label-caps text-right">Total</th>
                <th className="px-4 py-2.5 label-caps text-right border-l border-border-subtle">
                  Unit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {variantResults.map((variant) => {
                const bd = variant.breakdown || {
                  baseAllocation: 0,
                  specificIngredients: 0,
                  specificLabor: 0,
                  specificOverhead: 0,
                };
                const totalAddons =
                  bd.specificIngredients + bd.specificLabor + bd.specificOverhead;

                return (
                  <tr key={variant.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3 text-ink-900 font-medium">{variant.name}</td>
                    <td className="px-4 py-3 text-right tnum text-ink-500">
                      {formatCurrency(bd.baseAllocation)}
                    </td>
                    <td
                      className="px-4 py-3 text-right tnum text-ink-700"
                      title={`Ing: ${formatCurrency(bd.specificIngredients)}, Lab: ${formatCurrency(bd.specificLabor)}, Ov: ${formatCurrency(bd.specificOverhead)}`}
                    >
                      {formatCurrency(totalAddons)}
                    </td>
                    <td className="px-4 py-3 text-right tnum font-medium text-ink-900">
                      {formatCurrency(variant.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right tnum font-semibold text-clay border-l border-border-subtle">
                      {formatCurrency(variant.costPerUnit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
