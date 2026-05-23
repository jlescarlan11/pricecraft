import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button, PageHeader } from '../components/shared';
import { useCatalog } from '../hooks/use-catalog';
import { usePresets } from '../hooks/use-presets';
import { computeDriftFromPresets } from '../services/driftService';
import { useToast } from '../components/shared/Toast';
import { presetService } from '../services/presetService';
import { useAuth } from '../context/AuthContext';
import type { CatalogIngredient, Preset } from '../types';

const formatPct = (v: number) =>
  `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value);

function updatePresetIngredientsToCatalog(
  preset: Preset,
  catalog: CatalogIngredient[]
): Preset {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const patchIngredients = (ings: Preset['baseRecipe']['ingredients']) =>
    ings.map((ing) => {
      if (!ing.catalogIngredientId) return ing;
      const item = byId.get(ing.catalogIngredientId);
      if (!item || typeof ing.purchaseQuantity !== 'number' || !ing.purchaseUnit) {
        return ing;
      }
      const baseQty =
        ing.purchaseUnit.toLowerCase() === 'kg' ||
        ing.purchaseUnit.toLowerCase() === 'l'
          ? ing.purchaseQuantity * 1000
          : ing.purchaseQuantity;
      return { ...ing, purchaseCost: item.currentPricePerBaseUnit * baseQty };
    });

  return {
    ...preset,
    baseRecipe: {
      ...preset.baseRecipe,
      ingredients: patchIngredients(preset.baseRecipe.ingredients),
    },
    variants: preset.variants.map((v) => ({
      ...v,
      ingredients: patchIngredients(v.ingredients),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export const DriftPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: catalog } = useCatalog();
  const { presets } = usePresets();
  const toast = useToast();
  const [localPresets, setLocalPresets] = useState<Preset[]>(presets);

  useEffect(() => {
    setLocalPresets(presets);
  }, [presets]);

  const entries = useMemo(
    () => computeDriftFromPresets(catalog, localPresets),
    [catalog, localPresets]
  );

  const handleUpdatePreset = async (presetId: string) => {
    const preset = localPresets.find((p) => p.id === presetId);
    if (!preset) return;
    const updated = updatePresetIngredientsToCatalog(preset, catalog);
    await presetService.savePreset({ ...updated, userId: user?.id });
    setLocalPresets((ps) => ps.map((p) => (p.id === presetId ? updated : p)));
    toast.addToast('Recipe updated to current catalog prices.', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alerts"
        title="Price drift"
        description="Recipes whose ingredient prices have moved 5% or more since the last time you saved them."
        actions={
          <Button variant="ghost" onClick={() => navigate('/catalog')}>
            Back to catalog
          </Button>
        }
      />

      {entries.length === 0 ? (
        <div className="text-center py-2xl border border-dashed border-border-base rounded-xl">
          <p className="text-ink-500">
            No significant price drift detected. Your recipes are up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-lg">
          {entries.map((entry) => (
            <div
              key={entry.catalogIngredientId}
              className="bg-white p-lg rounded-xl border border-border-base shadow-sm"
            >
              <div className="flex items-start justify-between flex-wrap gap-sm">
                <div>
                  <h2 className="text-lg font-medium text-ink-900">
                    {entry.ingredientName}
                  </h2>
                  <p className="text-sm text-ink-500 mt-xs">
                    Price moved {formatPct(entry.percentChange)}{' '}
                    {entry.percentChange >= 0 ? (
                      <ArrowUpRight className="inline w-3 h-3 text-rust" />
                    ) : (
                      <ArrowDownRight className="inline w-3 h-3 text-moss" />
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-md space-y-sm">
                {entry.affectedPresets.map((ap) => (
                  <div
                    key={ap.presetId}
                    className="flex items-center justify-between py-sm border-t border-border-subtle"
                  >
                    <div>
                      <p className="text-sm text-ink-900 font-medium">
                        {ap.presetName}
                      </p>
                      <p className="text-xs text-ink-500 mt-xs">
                        Total cost: {formatPrice(ap.oldTotalCost)} →{' '}
                        {formatPrice(ap.newTotalCost)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUpdatePreset(ap.presetId)}
                    >
                      Update recipe
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
