import { describe, it, expect, beforeEach, vi } from 'vitest';
import { catalogService } from './catalogService';

// Mock the supabase client so the service stays offline in tests.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

describe('catalogService', () => {
  beforeEach(() => {
    catalogService._clearLocal();
    // Force offline behavior so we exercise the sync queue path.
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  });

  it('adds an ingredient and stores it locally', async () => {
    const ingredient = await catalogService.addIngredient(
      { name: 'Flour all purpose', purchaseQuantity: 1, purchaseUnit: 'kg', purchaseCost: 65 },
      'user-1'
    );
    expect(ingredient.id).toBeTruthy();
    expect(ingredient.normalizedName).toBe('flour all purpose');
    expect(ingredient.currentPricePerBaseUnit).toBeCloseTo(0.065, 5); // ₱65 / 1000g

    const catalog = await catalogService.fetchCatalog();
    expect(catalog).toHaveLength(1);
    expect(catalog[0].name).toBe('Flour all purpose');
  });

  it('queues writes when offline', async () => {
    await catalogService.addIngredient(
      { name: 'Sugar', purchaseQuantity: 1, purchaseUnit: 'kg', purchaseCost: 72 },
      'user-1'
    );
    const queue = catalogService._getSyncQueue();
    expect(queue.length).toBeGreaterThan(0);
    const types = queue.map((q) => q.action.type);
    expect(types).toContain('save-ingredient');
    expect(types).toContain('save-history');
  });

  it('updates an ingredient price and appends history', async () => {
    const ingredient = await catalogService.addIngredient(
      { name: 'Salt', purchaseQuantity: 1, purchaseUnit: 'kg', purchaseCost: 20 },
      'user-1'
    );
    const updated = await catalogService.updateIngredientPrice(
      {
        id: ingredient.id,
        purchaseQuantity: 1,
        purchaseUnit: 'kg',
        purchaseCost: 25,
        source: 'manual',
      },
      'user-1'
    );
    expect(updated).not.toBeNull();
    expect(updated!.purchaseCost).toBe(25);

    const history = await catalogService.fetchPriceHistory(ingredient.id);
    expect(history.length).toBe(2);
    expect(history[1].purchaseCost).toBe(25);
  });

  it('renames an ingredient and updates the normalized name', async () => {
    const ingredient = await catalogService.addIngredient(
      { name: 'flor', purchaseQuantity: 1, purchaseUnit: 'kg', purchaseCost: 65 },
      'user-1'
    );
    const renamed = await catalogService.renameIngredient(
      ingredient.id,
      'Flour All-Purpose',
      'user-1'
    );
    expect(renamed!.name).toBe('Flour All-Purpose');
    expect(renamed!.normalizedName).toBe('flour all purpose');
  });

  it('deletes an ingredient', async () => {
    const ingredient = await catalogService.addIngredient(
      { name: 'Yeast', purchaseQuantity: 1, purchaseUnit: 'sachet', purchaseCost: 12 },
      'user-1'
    );
    await catalogService.deleteIngredient(ingredient.id, 'user-1');
    const catalog = await catalogService.fetchCatalog();
    expect(catalog).toHaveLength(0);
  });

  it('saves a receipt locally and queues it', async () => {
    await catalogService.saveReceipt({
      id: 'r1',
      userId: 'user-1',
      storeName: 'SM',
      scannedAt: new Date().toISOString(),
      rawOcrText: 'Flour 1kg 65.00',
      lineCount: 1,
      acceptedCount: 1,
    });
    const queue = catalogService._getSyncQueue();
    expect(queue.some((q) => q.action.type === 'save-receipt')).toBe(true);
  });
});
