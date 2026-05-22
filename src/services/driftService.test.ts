import { describe, it, expect } from 'vitest';
import { computeDrift, DRIFT_THRESHOLD } from './driftService';
import type { CatalogIngredient, Preset } from '../types';

function makeCatalogItem(
  id: string,
  name: string,
  cost: number,
  qty = 1,
  unit = 'kg'
): CatalogIngredient {
  return {
    id,
    name,
    normalizedName: name.toLowerCase(),
    purchaseQuantity: qty,
    purchaseUnit: unit,
    purchaseCost: cost,
    currentPricePerBaseUnit: cost / (unit === 'kg' || unit === 'l' ? qty * 1000 : qty),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makePreset(
  id: string,
  name: string,
  ingredients: Preset['baseRecipe']['ingredients']
): Preset {
  return {
    id,
    name,
    presetType: 'default',
    baseRecipe: {
      productName: name,
      batchSize: 1,
      ingredients,
      laborCost: 0,
      overhead: 0,
    },
    variants: [],
    pricingConfig: { strategy: 'markup', value: 50 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('computeDrift', () => {
  it('returns no entries when no catalog prices changed', () => {
    const catalog = [makeCatalogItem('a', 'Flour', 65)];
    const prev = new Map([[catalog[0].id, catalog[0].currentPricePerBaseUnit]]);
    expect(computeDrift(catalog, prev, [])).toEqual([]);
  });

  it('ignores changes below the threshold', () => {
    const catalog = [makeCatalogItem('a', 'Flour', 65)];
    const prev = new Map([[catalog[0].id, catalog[0].currentPricePerBaseUnit * 0.99]]);
    expect(computeDrift(catalog, prev, [])).toEqual([]);
  });

  it('flags a price increase above the threshold', () => {
    const catalog = [makeCatalogItem('a', 'Flour', 80)]; // was 65 -> ~23% up
    const oldPrice = 65 / 1000;
    const prev = new Map([[catalog[0].id, oldPrice]]);
    const preset = makePreset('p1', 'Bread', [
      {
        id: 'i1',
        name: 'Flour',
        amount: 1,
        cost: 13,
        measurementMode: 'advanced',
        purchaseQuantity: 1,
        purchaseUnit: 'kg',
        purchaseCost: 65,
        recipeQuantity: 200,
        recipeUnit: 'g',
        catalogIngredientId: 'a',
      },
    ]);
    const drift = computeDrift(catalog, prev, [preset]);
    expect(drift).toHaveLength(1);
    expect(drift[0].percentChange).toBeGreaterThan(DRIFT_THRESHOLD);
    expect(drift[0].affectedPresets).toHaveLength(1);
    expect(drift[0].affectedPresets[0].presetId).toBe('p1');
    expect(drift[0].affectedPresets[0].newTotalCost).toBeGreaterThan(
      drift[0].affectedPresets[0].oldTotalCost
    );
  });

  it('skips presets that do not link the affected ingredient', () => {
    const catalog = [makeCatalogItem('a', 'Flour', 80)];
    const prev = new Map([[catalog[0].id, 65 / 1000]]);
    const preset = makePreset('p1', 'Salad', [
      { id: 'i1', name: 'Tomato', amount: 1, cost: 5 },
    ]);
    const drift = computeDrift(catalog, prev, [preset]);
    expect(drift).toEqual([]);
  });
});
