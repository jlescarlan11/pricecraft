import { supabase } from '../lib/supabase';
import type { SaleEntry } from '../types';

const STORAGE_KEY = 'pricing_calculator_sales';
const SYNC_QUEUE_KEY = 'pricing_calculator_sales_sync_queue';

type SyncAction =
  | { type: 'save'; payload: SaleEntry }
  | { type: 'delete'; payload: { id: string } };

interface SyncQueueItem {
  action: SyncAction;
  timestamp: number;
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getLocal(): SaleEntry[] {
  const arr = safeParse<SaleEntry[]>(STORAGE_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function setLocal(items: SaleEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function getQueue(): SyncQueueItem[] {
  const arr = safeParse<SyncQueueItem[]>(SYNC_QUEUE_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

function setQueue(q: SyncQueueItem[]) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

function enqueue(action: SyncAction) {
  const q = getQueue();
  q.push({ action, timestamp: Date.now() });
  setQueue(q);
}

function toDb(s: SaleEntry) {
  return {
    id: s.id,
    user_id: s.userId,
    preset_id: s.presetId,
    preset_name: s.presetName,
    units_sold: s.unitsSold,
    actual_price_per_unit: s.actualPricePerUnit,
    actual_cost_per_unit: s.actualCostPerUnit,
    occurred_at: s.occurredAt,
    notes: s.notes,
    created_at: s.createdAt,
  };
}

function fromDb(row: Record<string, unknown>): SaleEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string | undefined,
    presetId: row.preset_id as string,
    presetName: (row.preset_name as string) || '',
    unitsSold: Number(row.units_sold) || 0,
    actualPricePerUnit: Number(row.actual_price_per_unit) || 0,
    actualCostPerUnit: Number(row.actual_cost_per_unit) || 0,
    occurredAt: row.occurred_at as string,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
  };
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sale_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export interface NewSaleInput {
  presetId: string;
  presetName: string;
  unitsSold: number;
  actualPricePerUnit: number;
  actualCostPerUnit: number;
  occurredAt: string;
  notes?: string;
}

export const salesService = {
  async syncPendingItems(): Promise<void> {
    if (!navigator.onLine) return;
    const queue = getQueue();
    if (queue.length === 0) return;
    const remaining: SyncQueueItem[] = [];
    for (const item of queue) {
      try {
        if (item.action.type === 'save') {
          const { error } = await supabase.from('sales').upsert(toDb(item.action.payload));
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('sales')
            .delete()
            .eq('id', item.action.payload.id);
          if (error) throw error;
        }
      } catch (e) {
        console.error('Sales sync failed', e);
        remaining.push(item);
      }
    }
    setQueue(remaining);
  },

  async fetchSales(userId?: string): Promise<SaleEntry[]> {
    const local = getLocal();
    if (!userId || !navigator.onLine) return local;
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      if (!data) return local;
      const cloud = data.map((r) => fromDb(r as Record<string, unknown>));
      const map = new Map<string, SaleEntry>();
      local.forEach((s) => map.set(s.id, s));
      cloud.forEach((s) => map.set(s.id, s));
      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
      setLocal(merged);
      return merged;
    } catch (e) {
      console.error('Error fetching sales', e);
      return local;
    }
  },

  async addSale(input: NewSaleInput, userId?: string): Promise<SaleEntry> {
    const now = new Date().toISOString();
    const sale: SaleEntry = {
      id: genId(),
      userId,
      presetId: input.presetId,
      presetName: input.presetName,
      unitsSold: input.unitsSold,
      actualPricePerUnit: input.actualPricePerUnit,
      actualCostPerUnit: input.actualCostPerUnit,
      occurredAt: input.occurredAt,
      notes: input.notes,
      createdAt: now,
    };
    const list = getLocal();
    list.unshift(sale);
    setLocal(list);
    if (navigator.onLine && userId) {
      try {
        const { error } = await supabase.from('sales').upsert(toDb(sale));
        if (error) throw error;
      } catch (e) {
        console.error('Cloud sale save failed', e);
        enqueue({ type: 'save', payload: sale });
      }
    } else {
      enqueue({ type: 'save', payload: sale });
    }
    return sale;
  },

  async deleteSale(id: string, userId?: string): Promise<void> {
    setLocal(getLocal().filter((s) => s.id !== id));
    if (navigator.onLine && userId) {
      try {
        const { error } = await supabase.from('sales').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Cloud sale delete failed', e);
        enqueue({ type: 'delete', payload: { id } });
      }
    } else {
      enqueue({ type: 'delete', payload: { id } });
    }
  },

  _clearLocal() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  },
  _getQueue: getQueue,
};
