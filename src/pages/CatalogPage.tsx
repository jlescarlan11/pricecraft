import React, { useMemo, useState } from 'react';
import { Plus, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/shared';
import {
  CatalogList,
  AddIngredientModal,
  EditIngredientModal,
} from '../components/catalog';
import { useCatalog } from '../hooks/use-catalog';
import { normalizeIngredientName } from '../services/receiptParser';
import type { CatalogIngredient } from '../types';

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    status,
    addIngredient,
    updateIngredientPrice,
    renameIngredient,
    deleteIngredient,
  } = useCatalog();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogIngredient | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeIngredientName(search);
    if (!q) return items;
    return items.filter((i) => i.normalizedName.includes(q));
  }, [items, search]);

  const handleEditSave = async (input: {
    id: string;
    name: string;
    purchaseQuantity: number;
    purchaseUnit: string;
    purchaseCost: number;
  }) => {
    if (editing && editing.name !== input.name) {
      await renameIngredient(input.id, input.name);
    }
    await updateIngredientPrice({
      id: input.id,
      purchaseQuantity: input.purchaseQuantity,
      purchaseUnit: input.purchaseUnit,
      purchaseCost: input.purchaseCost,
      source: 'manual',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this ingredient from your catalog?')) return;
    await deleteIngredient(id);
  };

  return (
    <div className="space-y-xl max-w-4xl mx-auto">
      <div className="flex items-end justify-between border-b border-border-subtle pb-lg gap-md flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Ingredient catalog</h1>
          <p className="text-ink-500 mt-sm">
            Your personal price library. Scan receipts to keep prices fresh.
          </p>
        </div>
        <div className="flex gap-sm">
          <Button variant="secondary" onClick={() => navigate('/scan-receipt')}>
            <ScanLine className="w-4 h-4 mr-xs" aria-hidden="true" />
            Scan a receipt
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-xs" aria-hidden="true" />
            Add ingredient
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-md flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search"
            hideLabel
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients…"
          />
        </div>
        <p className="text-xs text-ink-400">
          {status === 'syncing'
            ? 'Syncing…'
            : status === 'offline'
              ? 'Offline'
              : status === 'error'
                ? 'Sync error'
                : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <CatalogList items={filtered} onEdit={setEditing} onDelete={handleDelete} />

      <AddIngredientModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (input) => {
          await addIngredient(input);
        }}
      />
      <EditIngredientModal
        isOpen={editing !== null}
        item={editing}
        onClose={() => setEditing(null)}
        onSave={handleEditSave}
      />
    </div>
  );
};
