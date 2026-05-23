import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Calculator } from 'lucide-react';
import { Button, Input, Select, PageHeader } from '../components/shared';
import { usePresets } from '../hooks/use-presets';
import { useSettings, formatMoney } from '../context/SettingsContext';
import type { Ingredient, Preset } from '../types';

interface ShoppingLineItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
}

function aggregateIngredients(preset: Preset, multiplier: number): ShoppingLineItem[] {
  const acc = new Map<string, ShoppingLineItem>();
  const consume = (ings: Ingredient[]) => {
    for (const ing of ings) {
      if (!ing.name?.trim()) continue;
      const key = `${ing.name.toLowerCase().trim()}|${ing.recipeUnit || ing.purchaseUnit || ''}`;
      const qty =
        (Number(ing.recipeQuantity) || Number(ing.amount) || 0) * multiplier;
      const cost = (Number(ing.cost) || 0) * multiplier;
      const existing = acc.get(key);
      if (existing) {
        existing.quantity += qty;
        existing.estimatedCost += cost;
      } else {
        acc.set(key, {
          name: ing.name,
          quantity: qty,
          unit: ing.recipeUnit || ing.purchaseUnit || '',
          estimatedCost: cost,
        });
      }
    }
  };
  if (preset.baseRecipe?.ingredients) consume(preset.baseRecipe.ingredients);
  if (preset.variants) preset.variants.forEach((v) => consume(v.ingredients));
  return Array.from(acc.values());
}

export const BatchPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { presets } = usePresets();
  const { settings } = useSettings();
  const [presetId, setPresetId] = useState('');
  const [targetUnits, setTargetUnits] = useState('30');

  const selected = useMemo(
    () => presets.find((p) => p.id === presetId) || null,
    [presets, presetId]
  );

  const multiplier = useMemo(() => {
    if (!selected) return 0;
    const batch = Number(selected.baseRecipe.batchSize) || 1;
    const target = Number(targetUnits) || 0;
    return target / batch;
  }, [selected, targetUnits]);

  const shoppingList = useMemo<ShoppingLineItem[]>(() => {
    if (!selected || multiplier <= 0) return [];
    return aggregateIngredients(selected, multiplier);
  }, [selected, multiplier]);

  const totalShoppingCost = shoppingList.reduce((sum, i) => sum + i.estimatedCost, 0);

  const scaledLabor = selected
    ? (Number(selected.baseRecipe.laborCost) || 0) * multiplier
    : 0;
  const scaledOverhead = selected
    ? (Number(selected.baseRecipe.overhead) || 0) * multiplier
    : 0;
  const scaledTotal = totalShoppingCost + scaledLabor + scaledOverhead;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Operations"
          title="Batch planner"
          description="Scale a recipe to a target unit count and get a deduplicated shopping list."
          actions={
            <>
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </Button>
              {shoppingList.length > 0 && (
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" aria-hidden="true" />
                  Print
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="card p-6 space-y-md print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="md:col-span-2">
            <Select
              label="Recipe"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              options={[
                { value: '', label: 'Choose a recipe…' },
                ...presets.map((p) => ({
                  value: p.id,
                  label: p.baseRecipe.productName || p.name,
                })),
              ]}
            />
          </div>
          <Input
            label="Target units"
            type="number"
            value={targetUnits}
            onChange={(e) => setTargetUnits(e.target.value)}
            min={1}
          />
        </div>
        {selected && (
          <p className="text-sm text-ink-500">
            Recipe base batch: {selected.baseRecipe.batchSize} units. Scaling by
            ×{multiplier.toFixed(2)}.
          </p>
        )}
      </div>

      {!selected ? (
        <div className="text-center py-2xl border border-dashed border-border-base rounded-xl text-ink-500 print:hidden">
          Choose a recipe to see the shopping list.
        </div>
      ) : (
        <div className="card p-6">
          <header className="border-b border-border-subtle pb-md mb-md print:text-center">
            <h2 className="font-serif text-2xl text-ink-900">
              {selected.baseRecipe.productName || selected.name}
            </h2>
            <p className="text-sm text-ink-500 mt-xs">
              Production run: {targetUnits} units
            </p>
          </header>

          <h3 className="text-sm uppercase tracking-wide text-ink-500 mb-sm">
            Shopping list
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="py-sm pr-md font-medium">Ingredient</th>
                <th className="py-sm pr-md font-medium text-right">Quantity</th>
                <th className="py-sm font-medium text-right">Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {shoppingList.map((item, i) => (
                <tr key={i} className="border-b border-border-subtle">
                  <td className="py-sm pr-md text-ink-900">{item.name}</td>
                  <td className="py-sm pr-md text-right font-mono text-ink-700">
                    {item.quantity.toFixed(2)} {item.unit}
                  </td>
                  <td className="py-sm text-right font-mono text-ink-900">
                    {formatMoney(item.estimatedCost, settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-sm pr-md font-medium text-ink-700">
                  Ingredients subtotal
                </td>
                <td />
                <td className="py-sm text-right font-mono font-medium text-ink-900">
                  {formatMoney(totalShoppingCost, settings.currency)}
                </td>
              </tr>
              <tr>
                <td className="py-sm pr-md text-ink-700">
                  Labor (scaled)
                </td>
                <td />
                <td className="py-sm text-right font-mono text-ink-700">
                  {formatMoney(scaledLabor, settings.currency)}
                </td>
              </tr>
              <tr>
                <td className="py-sm pr-md text-ink-700">Overhead (scaled)</td>
                <td />
                <td className="py-sm text-right font-mono text-ink-700">
                  {formatMoney(scaledOverhead, settings.currency)}
                </td>
              </tr>
              <tr className="border-t border-border-base">
                <td className="pt-md pr-md font-medium text-ink-900">
                  <span className="inline-flex items-center gap-xs">
                    <Calculator className="w-4 h-4" aria-hidden="true" />
                    Estimated total
                  </span>
                </td>
                <td />
                <td className="pt-md text-right font-mono font-medium text-ink-900">
                  {formatMoney(scaledTotal, settings.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
