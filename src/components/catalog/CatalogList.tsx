import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, BookOpen } from 'lucide-react';
import type { CatalogIngredient, PriceHistoryEntry } from '../../types';
import { catalogService } from '../../services/catalogService';
import { useAuth } from '../../context/AuthContext';
import { Button, EmptyState } from '../shared';
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
      <EmptyState
        icon={<BookOpen className="w-5 h-5" />}
        title="No ingredients yet"
        description="Add an ingredient manually or scan a grocery receipt to populate your catalog."
      />
    );
  }

  return (
    <div className="card-flat overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface/60 border-b border-border-subtle text-left">
              <th className="px-4 py-2.5 label-caps">Ingredient</th>
              <th className="px-4 py-2.5 label-caps">Current price</th>
              <th className="px-4 py-2.5 label-caps">Trend</th>
              <th className="px-4 py-2.5 label-caps">Updated</th>
              <th className="px-4 py-2.5 label-caps text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((item) => {
              const h = history[item.id] || [];
              const prices = h.map((e) => e.purchaseCost / e.purchaseQuantity);
              return (
                <tr
                  key={item.id}
                  className="hover:bg-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 text-ink-900 font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-ink-700 tnum">
                    {formatPrice(item.purchaseCost)}{' '}
                    <span className="text-ink-400">
                      / {item.purchaseQuantity}
                      {item.purchaseUnit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PriceSparkline values={prices} />
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item.id)}
                        aria-label={`Delete ${item.name}`}
                        className="text-rust-700 hover:bg-rust-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
