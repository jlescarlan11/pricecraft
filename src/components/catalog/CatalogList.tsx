import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { CatalogIngredient, PriceHistoryEntry } from '../../types';
import { catalogService } from '../../services/catalogService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../shared';
import { PriceSparkline } from './PriceSparkline';

interface CatalogListProps {
  items: CatalogIngredient[];
  onEdit: (item: CatalogIngredient) => void;
  onDelete: (id: string) => Promise<void>;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const CatalogList: React.FC<CatalogListProps> = ({ items, onEdit, onDelete }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<Record<string, PriceHistoryEntry[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, PriceHistoryEntry[]> = {};
      for (const item of items) {
        const h = await catalogService.fetchPriceHistory(item.id, user?.id);
        next[item.id] = h;
      }
      if (!cancelled) setHistory(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [items, user]);

  if (items.length === 0) {
    return (
      <div className="text-center py-2xl border border-dashed border-border-base rounded-xl">
        <p className="text-ink-500">
          Your catalog is empty. Add an ingredient or scan a receipt to start.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-500 border-b border-border-subtle">
            <th className="py-sm pr-md font-medium">Ingredient</th>
            <th className="py-sm pr-md font-medium">Current price</th>
            <th className="py-sm pr-md font-medium">Trend</th>
            <th className="py-sm pr-md font-medium">Updated</th>
            <th className="py-sm font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const h = history[item.id] || [];
            const prices = h.map((e) => e.purchaseCost / e.purchaseQuantity);
            return (
              <tr key={item.id} className="border-b border-border-subtle">
                <td className="py-md pr-md text-ink-900">{item.name}</td>
                <td className="py-md pr-md text-ink-700">
                  {formatPrice(item.purchaseCost)}{' '}
                  <span className="text-ink-400">
                    / {item.purchaseQuantity}
                    {item.purchaseUnit}
                  </span>
                </td>
                <td className="py-md pr-md">
                  <PriceSparkline values={prices} />
                </td>
                <td className="py-md pr-md text-ink-500">{formatDate(item.updatedAt)}</td>
                <td className="py-md text-right">
                  <div className="inline-flex gap-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Delete ${item.name}`}
                      className="text-rust hover:bg-rust/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
