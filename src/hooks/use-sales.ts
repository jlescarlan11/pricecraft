import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { salesService, type NewSaleInput } from '../services/salesService';
import type { SaleEntry } from '../types';

export function useSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [status, setStatus] = useState<'syncing' | 'synced' | 'offline' | 'error'>(
    'syncing'
  );

  const load = useCallback(async () => {
    setStatus('syncing');
    try {
      const data = await salesService.fetchSales(user?.id);
      setSales(data);
      setStatus(navigator.onLine ? 'synced' : 'offline');
    } catch {
      setStatus('error');
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const initial = async () => {
      if (isMounted) await load();
    };
    initial();
    return () => {
      isMounted = false;
    };
  }, [load]);

  const addSale = useCallback(
    async (input: NewSaleInput) => {
      const created = await salesService.addSale(input, user?.id);
      await load();
      return created;
    },
    [user, load]
  );

  const deleteSale = useCallback(
    async (id: string) => {
      await salesService.deleteSale(id, user?.id);
      await load();
    },
    [user, load]
  );

  return { sales, status, addSale, deleteSale, reload: load };
}
