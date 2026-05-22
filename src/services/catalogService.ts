import { supabase } from '../lib/supabase';
import type {
  CatalogIngredient,
  PriceHistoryEntry,
  ReceiptScan,
} from '../types';
import { normalizeIngredientName, pricePerBaseUnit } from './receiptParser';

const CATALOG_KEY = 'pricing_calculator_catalog';
const HISTORY_KEY = 'pricing_calculator_price_history';
const RECEIPTS_KEY = 'pricing_calculator_receipts';
const SYNC_QUEUE_KEY = 'pricing_calculator_catalog_sync_queue';

type SyncAction =
  | { type: 'save-ingredient'; payload: CatalogIngredient }
  | { type: 'delete-ingredient'; payload: { id: string } }
  | { type: 'save-history'; payload: PriceHistoryEntry }
  | { type: 'save-receipt'; payload: ReceiptScan };

interface SyncQueueItem {
  action: SyncAction;
  timestamp: number;
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function getLocalCatalog(): CatalogIngredient[] {
  const arr = safeParse<CatalogIngredient[]>(CATALOG_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function setLocalCatalog(items: CatalogIngredient[]) {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving catalog', e);
  }
}

function getLocalHistory(): PriceHistoryEntry[] {
  const arr = safeParse<PriceHistoryEntry[]>(HISTORY_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function setLocalHistory(items: PriceHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving price history', e);
  }
}

function getLocalReceipts(): ReceiptScan[] {
  const arr = safeParse<ReceiptScan[]>(RECEIPTS_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function setLocalReceipts(items: ReceiptScan[]) {
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving receipts', e);
  }
}

function getSyncQueue(): SyncQueueItem[] {
  const arr = safeParse<SyncQueueItem[]>(SYNC_QUEUE_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function setSyncQueue(queue: SyncQueueItem[]) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving sync queue', e);
  }
}

function enqueue(action: SyncAction) {
  const queue = getSyncQueue();
  queue.push({ action, timestamp: Date.now() });
  setSyncQueue(queue);
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function ingredientToDb(item: CatalogIngredient) {
  return {
    id: item.id,
    user_id: item.userId,
    name: item.name,
    normalized_name: item.normalizedName,
    purchase_quantity: item.purchaseQuantity,
    purchase_unit: item.purchaseUnit,
    purchase_cost: item.purchaseCost,
    current_price_per_base_unit: item.currentPricePerBaseUnit,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    last_synced_at: new Date().toISOString(),
  };
}

function ingredientFromDb(row: Record<string, unknown>): CatalogIngredient {
  return {
    id: row.id as string,
    userId: row.user_id as string | undefined,
    name: row.name as string,
    normalizedName: row.normalized_name as string,
    purchaseQuantity: Number(row.purchase_quantity) || 0,
    purchaseUnit: (row.purchase_unit as string) || '',
    purchaseCost: Number(row.purchase_cost) || 0,
    currentPricePerBaseUnit: Number(row.current_price_per_base_unit) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastSyncedAt: row.last_synced_at as string | null | undefined,
  };
}

function historyToDb(item: PriceHistoryEntry) {
  return {
    id: item.id,
    catalog_ingredient_id: item.catalogIngredientId,
    user_id: item.userId,
    purchase_quantity: item.purchaseQuantity,
    purchase_unit: item.purchaseUnit,
    purchase_cost: item.purchaseCost,
    source: item.source,
    receipt_id: item.receiptId,
    recorded_at: item.recordedAt,
  };
}

function historyFromDb(row: Record<string, unknown>): PriceHistoryEntry {
  return {
    id: row.id as string,
    catalogIngredientId: row.catalog_ingredient_id as string,
    userId: row.user_id as string | undefined,
    purchaseQuantity: Number(row.purchase_quantity) || 0,
    purchaseUnit: (row.purchase_unit as string) || '',
    purchaseCost: Number(row.purchase_cost) || 0,
    source: (row.source as 'manual' | 'receipt') || 'manual',
    receiptId: (row.receipt_id as string | null) ?? null,
    recordedAt: row.recorded_at as string,
  };
}

function receiptToDb(item: ReceiptScan) {
  return {
    id: item.id,
    user_id: item.userId,
    store_name: item.storeName,
    scanned_at: item.scannedAt,
    raw_ocr_text: item.rawOcrText,
    line_count: item.lineCount,
    accepted_count: item.acceptedCount,
  };
}

export interface NewIngredientInput {
  name: string;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchaseCost: number;
}

export interface UpdateIngredientPriceInput {
  id: string;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchaseCost: number;
  source: 'manual' | 'receipt';
  receiptId?: string | null;
}

export const catalogService = {
  // ---------- Sync ----------
  async syncPendingItems(): Promise<void> {
    if (!navigator.onLine) return;
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    const remaining: SyncQueueItem[] = [];
    for (const item of queue) {
      try {
        const a = item.action;
        if (a.type === 'save-ingredient') {
          const { error } = await supabase
            .from('catalog_ingredients')
            .upsert(ingredientToDb(a.payload));
          if (error) throw error;
        } else if (a.type === 'delete-ingredient') {
          const { error } = await supabase
            .from('catalog_ingredients')
            .delete()
            .eq('id', a.payload.id);
          if (error) throw error;
        } else if (a.type === 'save-history') {
          const { error } = await supabase
            .from('price_history')
            .upsert(historyToDb(a.payload));
          if (error) throw error;
        } else if (a.type === 'save-receipt') {
          const { error } = await supabase
            .from('receipts')
            .upsert(receiptToDb(a.payload));
          if (error) throw error;
        }
      } catch (e) {
        console.error('Catalog sync failed for item', item, e);
        remaining.push(item);
      }
    }
    setSyncQueue(remaining);
  },

  // ---------- Fetch ----------
  async fetchCatalog(userId?: string): Promise<CatalogIngredient[]> {
    const local = getLocalCatalog();
    if (!userId || !navigator.onLine) return local;

    try {
      const { data, error } = await supabase
        .from('catalog_ingredients')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      if (!data) return local;

      const cloud = data.map((row) => ingredientFromDb(row as Record<string, unknown>));
      const map = new Map<string, CatalogIngredient>();
      local.forEach((i) => map.set(i.id, i));
      cloud.forEach((c) => {
        const l = map.get(c.id);
        if (!l) {
          map.set(c.id, c);
        } else {
          const lt = new Date(l.updatedAt).getTime();
          const ct = new Date(c.updatedAt).getTime();
          if (ct > lt) map.set(c.id, c);
        }
      });
      const merged = Array.from(map.values());
      setLocalCatalog(merged);
      return merged;
    } catch (e) {
      console.error('Error fetching catalog', e);
      return local;
    }
  },

  async fetchPriceHistory(
    catalogIngredientId: string,
    userId?: string
  ): Promise<PriceHistoryEntry[]> {
    const local = getLocalHistory().filter(
      (h) => h.catalogIngredientId === catalogIngredientId
    );
    if (!userId || !navigator.onLine) return local;

    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('catalog_ingredient_id', catalogIngredientId)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      if (!data) return local;

      const cloud = data.map((row) => historyFromDb(row as Record<string, unknown>));
      const map = new Map<string, PriceHistoryEntry>();
      local.forEach((h) => map.set(h.id, h));
      cloud.forEach((c) => map.set(c.id, c));
      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
    } catch (e) {
      console.error('Error fetching price history', e);
      return local;
    }
  },

  // ---------- Mutations ----------
  async addIngredient(
    input: NewIngredientInput,
    userId?: string
  ): Promise<CatalogIngredient> {
    const now = new Date().toISOString();
    const id = genId();
    const ingredient: CatalogIngredient = {
      id,
      userId,
      name: input.name.trim(),
      normalizedName: normalizeIngredientName(input.name),
      purchaseQuantity: input.purchaseQuantity,
      purchaseUnit: input.purchaseUnit,
      purchaseCost: input.purchaseCost,
      currentPricePerBaseUnit: pricePerBaseUnit(
        input.purchaseCost,
        input.purchaseQuantity,
        input.purchaseUnit
      ),
      createdAt: now,
      updatedAt: now,
    };

    const catalog = getLocalCatalog();
    catalog.push(ingredient);
    setLocalCatalog(catalog);

    const historyEntry: PriceHistoryEntry = {
      id: genId(),
      catalogIngredientId: id,
      userId,
      purchaseQuantity: input.purchaseQuantity,
      purchaseUnit: input.purchaseUnit,
      purchaseCost: input.purchaseCost,
      source: 'manual',
      receiptId: null,
      recordedAt: now,
    };
    const history = getLocalHistory();
    history.push(historyEntry);
    setLocalHistory(history);

    if (navigator.onLine && userId) {
      try {
        const { error: e1 } = await supabase
          .from('catalog_ingredients')
          .upsert(ingredientToDb(ingredient));
        if (e1) throw e1;
        const { error: e2 } = await supabase
          .from('price_history')
          .upsert(historyToDb(historyEntry));
        if (e2) throw e2;
      } catch (e) {
        console.error('Cloud save failed, queuing', e);
        enqueue({ type: 'save-ingredient', payload: ingredient });
        enqueue({ type: 'save-history', payload: historyEntry });
      }
    } else {
      enqueue({ type: 'save-ingredient', payload: ingredient });
      enqueue({ type: 'save-history', payload: historyEntry });
    }

    return ingredient;
  },

  async updateIngredientPrice(
    input: UpdateIngredientPriceInput,
    userId?: string
  ): Promise<CatalogIngredient | null> {
    const catalog = getLocalCatalog();
    const idx = catalog.findIndex((i) => i.id === input.id);
    if (idx < 0) return null;

    const now = new Date().toISOString();
    const updated: CatalogIngredient = {
      ...catalog[idx],
      purchaseQuantity: input.purchaseQuantity,
      purchaseUnit: input.purchaseUnit,
      purchaseCost: input.purchaseCost,
      currentPricePerBaseUnit: pricePerBaseUnit(
        input.purchaseCost,
        input.purchaseQuantity,
        input.purchaseUnit
      ),
      updatedAt: now,
    };
    catalog[idx] = updated;
    setLocalCatalog(catalog);

    const historyEntry: PriceHistoryEntry = {
      id: genId(),
      catalogIngredientId: input.id,
      userId,
      purchaseQuantity: input.purchaseQuantity,
      purchaseUnit: input.purchaseUnit,
      purchaseCost: input.purchaseCost,
      source: input.source,
      receiptId: input.receiptId ?? null,
      recordedAt: now,
    };
    const history = getLocalHistory();
    history.push(historyEntry);
    setLocalHistory(history);

    if (navigator.onLine && userId) {
      try {
        const { error: e1 } = await supabase
          .from('catalog_ingredients')
          .upsert(ingredientToDb(updated));
        if (e1) throw e1;
        const { error: e2 } = await supabase
          .from('price_history')
          .upsert(historyToDb(historyEntry));
        if (e2) throw e2;
      } catch (e) {
        console.error('Cloud update failed, queuing', e);
        enqueue({ type: 'save-ingredient', payload: updated });
        enqueue({ type: 'save-history', payload: historyEntry });
      }
    } else {
      enqueue({ type: 'save-ingredient', payload: updated });
      enqueue({ type: 'save-history', payload: historyEntry });
    }

    return updated;
  },

  async renameIngredient(
    id: string,
    name: string,
    userId?: string
  ): Promise<CatalogIngredient | null> {
    const catalog = getLocalCatalog();
    const idx = catalog.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    const updated: CatalogIngredient = {
      ...catalog[idx],
      name: name.trim(),
      normalizedName: normalizeIngredientName(name),
      updatedAt: new Date().toISOString(),
    };
    catalog[idx] = updated;
    setLocalCatalog(catalog);

    if (navigator.onLine && userId) {
      try {
        const { error } = await supabase
          .from('catalog_ingredients')
          .upsert(ingredientToDb(updated));
        if (error) throw error;
      } catch (e) {
        console.error('Rename cloud failed, queuing', e);
        enqueue({ type: 'save-ingredient', payload: updated });
      }
    } else {
      enqueue({ type: 'save-ingredient', payload: updated });
    }
    return updated;
  },

  async deleteIngredient(id: string, userId?: string): Promise<void> {
    const catalog = getLocalCatalog();
    setLocalCatalog(catalog.filter((i) => i.id !== id));

    if (navigator.onLine && userId) {
      try {
        const { error } = await supabase
          .from('catalog_ingredients')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Delete cloud failed, queuing', e);
        enqueue({ type: 'delete-ingredient', payload: { id } });
      }
    } else {
      enqueue({ type: 'delete-ingredient', payload: { id } });
    }
  },

  async saveReceipt(receipt: ReceiptScan): Promise<void> {
    const receipts = getLocalReceipts();
    receipts.push(receipt);
    setLocalReceipts(receipts);

    if (navigator.onLine && receipt.userId) {
      try {
        const { error } = await supabase
          .from('receipts')
          .upsert(receiptToDb(receipt));
        if (error) throw error;
      } catch (e) {
        console.error('Receipt save failed, queuing', e);
        enqueue({ type: 'save-receipt', payload: receipt });
      }
    } else {
      enqueue({ type: 'save-receipt', payload: receipt });
    }
  },

  // ---------- Local-only helpers (for tests/debug) ----------
  _getLocalCatalog: getLocalCatalog,
  _getSyncQueue: getSyncQueue,
  _clearLocal() {
    localStorage.removeItem(CATALOG_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(RECEIPTS_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  },

  genId,
};
