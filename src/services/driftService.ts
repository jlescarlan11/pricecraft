import type {
  CatalogIngredient,
  DriftEntry,
  Preset,
  Ingredient,
} from '../types';
import { pricePerBaseUnit } from './receiptParser';

export const DRIFT_THRESHOLD = 0.05; // 5%

function computeIngredientCost(ing: Ingredient): number {
  // Mirror the calculator's existing logic for "advanced" mode.
  if (
    ing.measurementMode === 'advanced' &&
    typeof ing.purchaseCost === 'number' &&
    typeof ing.purchaseQuantity === 'number' &&
    ing.purchaseQuantity > 0 &&
    typeof ing.recipeQuantity === 'number'
  ) {
    if (ing.useFullQuantity) return ing.purchaseCost;
    return (ing.purchaseCost / ing.purchaseQuantity) * ing.recipeQuantity;
  }
  return typeof ing.cost === 'number' ? ing.cost : 0;
}

function allIngredientsInPreset(preset: Preset): Ingredient[] {
  const result: Ingredient[] = [];
  const base = preset.baseRecipe;
  if (base && Array.isArray(base.ingredients)) result.push(...base.ingredients);
  if (Array.isArray(preset.variants)) {
    for (const v of preset.variants) {
      if (Array.isArray(v.ingredients)) result.push(...v.ingredients);
    }
  }
  return result;
}

function presetTotalCost(preset: Preset): number {
  return allIngredientsInPreset(preset).reduce(
    (sum, ing) => sum + computeIngredientCost(ing),
    0
  );
}

// Apply a catalog price to a single ingredient row: recompute purchaseCost
// at the row's purchaseQuantity to mirror what the user would see after sync.
function recomputeIngredientAtCurrentPrice(
  ing: Ingredient,
  catalogItem: CatalogIngredient
): Ingredient {
  if (
    typeof ing.purchaseQuantity !== 'number' ||
    !ing.purchaseUnit ||
    ing.purchaseQuantity <= 0
  ) {
    return ing;
  }
  // Convert catalog purchase price to the row's unit by base unit math.
  const rowBaseQty =
    ing.purchaseUnit.toLowerCase() === 'kg' || ing.purchaseUnit.toLowerCase() === 'l'
      ? ing.purchaseQuantity * 1000
      : ing.purchaseQuantity;
  const newCost = catalogItem.currentPricePerBaseUnit * rowBaseQty;
  return { ...ing, purchaseCost: newCost };
}

function presetTotalCostAtCurrentPrices(
  preset: Preset,
  catalogById: Map<string, CatalogIngredient>
): number {
  const swapped = allIngredientsInPreset(preset).map((ing) => {
    if (!ing.catalogIngredientId) return ing;
    const cat = catalogById.get(ing.catalogIngredientId);
    if (!cat) return ing;
    return recomputeIngredientAtCurrentPrice(ing, cat);
  });
  return swapped.reduce((sum, ing) => sum + computeIngredientCost(ing), 0);
}

export interface DriftSnapshot {
  ingredient: CatalogIngredient;
  oldPricePerBaseUnit: number;
}

export function computeDrift(
  catalog: CatalogIngredient[],
  previousPrices: Map<string, number>,
  presets: Preset[]
): DriftEntry[] {
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const entries: DriftEntry[] = [];

  for (const item of catalog) {
    const prev = previousPrices.get(item.id);
    if (prev === undefined || prev === 0) continue;
    const pctChange = (item.currentPricePerBaseUnit - prev) / prev;
    if (Math.abs(pctChange) < DRIFT_THRESHOLD) continue;

    const affected = presets
      .filter((p) =>
        allIngredientsInPreset(p).some((ing) => ing.catalogIngredientId === item.id)
      )
      .map((p) => {
        const newTotal = presetTotalCostAtCurrentPrices(p, catalogById);
        const oldTotal = presetTotalCost(p);
        return {
          presetId: p.id,
          presetName: p.name,
          oldTotalCost: oldTotal,
          newTotalCost: newTotal,
        };
      });

    if (affected.length === 0) continue;

    entries.push({
      catalogIngredientId: item.id,
      ingredientName: item.name,
      oldPricePerBaseUnit: prev,
      newPricePerBaseUnit: item.currentPricePerBaseUnit,
      percentChange: pctChange,
      affectedPresets: affected,
    });
  }

  return entries;
}

// Derive drift directly from presets: for every linked ingredient row, compare
// the price embedded in the row vs the current catalog price. This avoids a
// separate price-snapshot store.
export function computeDriftFromPresets(
  catalog: CatalogIngredient[],
  presets: Preset[]
): DriftEntry[] {
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const grouped = new Map<string, {
    item: CatalogIngredient;
    embeddedPrices: number[];
    affected: DriftEntry['affectedPresets'];
  }>();

  for (const preset of presets) {
    const rows = allIngredientsInPreset(preset);
    let presetIsAffected = false;
    for (const ing of rows) {
      if (!ing.catalogIngredientId) continue;
      const item = catalogById.get(ing.catalogIngredientId);
      if (!item) continue;
      if (
        typeof ing.purchaseCost !== 'number' ||
        typeof ing.purchaseQuantity !== 'number' ||
        !ing.purchaseUnit
      )
        continue;

      const rowPpu =
        ing.purchaseCost /
        (ing.purchaseUnit.toLowerCase() === 'kg' ||
        ing.purchaseUnit.toLowerCase() === 'l'
          ? ing.purchaseQuantity * 1000
          : ing.purchaseQuantity);

      if (rowPpu <= 0) continue;
      const pct = (item.currentPricePerBaseUnit - rowPpu) / rowPpu;
      if (Math.abs(pct) < DRIFT_THRESHOLD) continue;

      const entry = grouped.get(item.id) ?? {
        item,
        embeddedPrices: [],
        affected: [],
      };
      entry.embeddedPrices.push(rowPpu);
      grouped.set(item.id, entry);
      presetIsAffected = true;
    }
    if (presetIsAffected) {
      for (const [, v] of grouped) {
        const newTotal = presetTotalCostAtCurrentPrices(preset, catalogById);
        const oldTotal = presetTotalCost(preset);
        const alreadyListed = v.affected.find((a) => a.presetId === preset.id);
        if (!alreadyListed && rowsInPresetLinkTo(preset, v.item.id)) {
          v.affected.push({
            presetId: preset.id,
            presetName: preset.name,
            oldTotalCost: oldTotal,
            newTotalCost: newTotal,
          });
        }
      }
    }
  }

  const entries: DriftEntry[] = [];
  for (const [, v] of grouped) {
    if (v.affected.length === 0) continue;
    const avgOld =
      v.embeddedPrices.reduce((s, p) => s + p, 0) / v.embeddedPrices.length;
    entries.push({
      catalogIngredientId: v.item.id,
      ingredientName: v.item.name,
      oldPricePerBaseUnit: avgOld,
      newPricePerBaseUnit: v.item.currentPricePerBaseUnit,
      percentChange: (v.item.currentPricePerBaseUnit - avgOld) / avgOld,
      affectedPresets: v.affected,
    });
  }
  return entries;
}

function rowsInPresetLinkTo(preset: Preset, catalogId: string): boolean {
  return allIngredientsInPreset(preset).some(
    (i) => i.catalogIngredientId === catalogId
  );
}

// Helper used by the IngredientRow integration: given a catalog id and the
// row's existing purchaseQuantity/Unit, return a fresh purchaseCost.
export function costFromCatalog(
  catalogItem: CatalogIngredient,
  purchaseQuantity: number,
  purchaseUnit: string
): number {
  return pricePerBaseUnit(
    catalogItem.purchaseCost,
    catalogItem.purchaseQuantity,
    catalogItem.purchaseUnit
  ) *
    (purchaseUnit.toLowerCase() === 'kg' || purchaseUnit.toLowerCase() === 'l'
      ? purchaseQuantity * 1000
      : purchaseQuantity);
}
