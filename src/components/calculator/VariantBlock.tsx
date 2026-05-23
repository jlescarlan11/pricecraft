import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Card, Button, Input } from '../shared';
import { IngredientRow, LaborCost, OverheadCost, PricingStrategy, CurrentPrice } from './index';
import type { Variant, Ingredient } from '../../types/calculator';

interface VariantBlockProps {
  variant: Variant;
  index: number;
  remainingBatch: number; // Remaining batch from base
  costPerUnit: number;
  onUpdate: (id: string, updates: Partial<Variant>) => void;
  onRemove: (id: string) => void;
  onUpdateIngredient: (
    variantId: string,
    ingredientId: string,
    field: keyof Ingredient,
    value: string | number | boolean
  ) => void;
  onAddIngredient: (variantId: string) => void;
  onRemoveIngredient: (variantId: string, ingredientId: string) => void;
  errors?: Record<string, string>;
}

export const VariantBlock: React.FC<VariantBlockProps> = ({
  variant,
  index,
  remainingBatch,
  costPerUnit,
  onUpdate,
  onRemove,
  onUpdateIngredient,
  onAddIngredient,
  onRemoveIngredient,
  errors = {},
}) => {
  // Calculate variant specific cost per unit for preview in PricingStrategy
  // This is a rough preview; the main calculation happens in performFullCalculation
  // We can approximate it or just leave it blank until calculated.
  // Ideally, we run the calculation logic here or pass it down.
  // For now, let's keep it simple.

  const maxBatchSize = Math.max(0, variant.batchSize + remainingBatch);

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) {
      onUpdate(variant.id, { batchSize: 0 });
      return;
    }
    // Clamp the value between 0 and maxBatchSize
    const clampedVal = Math.max(0, Math.min(val, maxBatchSize));
    onUpdate(variant.id, { batchSize: clampedVal });
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between w-full">
          <Input
            value={variant.name}
            onChange={(e) => onUpdate(variant.id, { name: e.target.value })}
            placeholder={`Variant ${index + 1} Name`}
            className="text-base font-semibold bg-transparent border-none p-0 focus:ring-0 w-full"
            error={errors[`variants.${variant.id}.name`]}
            aria-label={`Variant ${index + 1} Name`}
          />
          <Button
            variant="ghost"
            onClick={() => onRemove(variant.id)}
            className="text-rust hover:bg-rust/10 p-sm h-auto"
            aria-label="Remove Variant"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-lg">
        {/* Allocation */}
        <div className="bg-surface-hover p-md rounded-lg border border-border-subtle">
          <Input
            label={`Batch Allocation (Max: ${maxBatchSize})`}
            type="number"
            value={variant.batchSize}
            onChange={handleBatchChange}
            className="w-full"
            min={0}
            max={maxBatchSize}
            error={errors[`variants.${variant.id}.batchSize`]}
            suffix="units"
            helperText="from base batch"
          />
        </div>

        <div className="h-px bg-border-subtle" role="separator" />

        {/* Specific Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-sm">
            <h4 className="text-sm font-medium text-ink-900 uppercase tracking-wide">
              Additional Ingredients
            </h4>
            <span className="text-xs text-ink-500">{variant.ingredients.length} items</span>
          </div>

          <div className="space-y-md">
            <div className="flex flex-col space-y-4 md:space-y-0 md:divide-y md:divide-border-subtle">
              {variant.ingredients.map((ing, idx) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  index={idx}
                  isOnlyRow={false}
                  onUpdate={(id, field, val) => onUpdateIngredient(variant.id, id, field, val)}
                  onRemove={(id) => onRemoveIngredient(variant.id, id)}
                  onAdd={() => onAddIngredient(variant.id)}
                  errors={{
                    name: errors[`variants.${variant.id}.ingredients.${ing.id}.name`],
                    purchaseQuantity: errors[`variants.${variant.id}.ingredients.${ing.id}.purchaseQuantity`],
                    purchaseCost: errors[`variants.${variant.id}.ingredients.${ing.id}.purchaseCost`],
                    recipeQuantity: errors[`variants.${variant.id}.ingredients.${ing.id}.recipeQuantity`],
                    cost: errors[`variants.${variant.id}.ingredients.${ing.id}.cost`],
                  }}
                />
              ))}
            </div>

            <Button
              variant="dashed"
              onClick={() => onAddIngredient(variant.id)}
              className="w-full flex items-center justify-center gap-sm"
            >
              <Plus className="w-5 h-5" />
              Add Variant Ingredient
            </Button>
          </div>
        </div>

        <div className="h-px bg-border-subtle" role="separator" />

        {/* Specific Costs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <LaborCost
            value={variant.laborCost}
            onChange={(val) => onUpdate(variant.id, { laborCost: val })}
            label="Additional Labor"
          />
          <OverheadCost
            value={variant.overhead}
            batchSize={variant.batchSize} // Use variant batch size for per-unit display? Or logic handles it? Component just displays total.
            onChange={(val) => onUpdate(variant.id, { overhead: val })}
            label="Additional Overhead"
          />
        </div>

        <div className="h-px bg-border-subtle" role="separator" />

        {/* Specific Strategy */}
        <PricingStrategy
          strategy={variant.pricingConfig.strategy}
          value={variant.pricingConfig.value}
          costPerUnit={costPerUnit}
          onChange={(strategy, value) =>
            onUpdate(variant.id, { pricingConfig: { strategy, value } })
          }
          embedded
        />

        <div className="h-px bg-border-subtle" role="separator" />

        {/* Current Price */}
        <CurrentPrice
          value={variant.currentSellingPrice}
          onChange={(val) => onUpdate(variant.id, { currentSellingPrice: val })}
          embedded
        />
      </div>
    </Card>
  );
};
