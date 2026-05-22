import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { catalogService } from '../services/catalogService';
import type {
  NewIngredientInput,
  UpdateIngredientPriceInput,
} from '../services/catalogService';
import type { CatalogIngredient as CIType } from '../types';

export type CatalogSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export function useCatalog() {
  const { user } = useAuth();
  const [items, setItems] = useState<CIType[]>([]);
  const [status, setStatus] = useState<CatalogSyncStatus>('syncing');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('syncing');
    try {
      const data = await catalogService.fetchCatalog(user?.id);
      setItems(data);
      setStatus(navigator.onLine ? 'synced' : 'offline');
    } catch (e) {
      console.error(e);
      setError('Failed to load catalog');
      setStatus('error');
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      if (isMounted) {
        await load();
      }
    };
    initialLoad();
    return () => {
      isMounted = false;
    };
  }, [load]);

  useEffect(() => {
    const handleOnline = () => {
      setStatus('syncing');
      catalogService
        .syncPendingItems()
        .then(() => load())
        .catch(() => setStatus('error'));
    };
    const handleOffline = () => setStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [load]);

  const addIngredient = useCallback(
    async (input: NewIngredientInput) => {
      const created = await catalogService.addIngredient(input, user?.id);
      await load();
      return created;
    },
    [user, load]
  );

  const updateIngredientPrice = useCallback(
    async (input: UpdateIngredientPriceInput) => {
      const updated = await catalogService.updateIngredientPrice(input, user?.id);
      await load();
      return updated;
    },
    [user, load]
  );

  const renameIngredient = useCallback(
    async (id: string, name: string) => {
      const updated = await catalogService.renameIngredient(id, name, user?.id);
      await load();
      return updated;
    },
    [user, load]
  );

  const deleteIngredient = useCallback(
    async (id: string) => {
      await catalogService.deleteIngredient(id, user?.id);
      await load();
    },
    [user, load]
  );

  return {
    items,
    status,
    error,
    reload: load,
    addIngredient,
    updateIngredientPrice,
    renameIngredient,
    deleteIngredient,
  };
}
