import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Plus } from 'lucide-react';
import { Button, Input, Select } from '../shared';
import type { CatalogIngredient, ParsedReceiptLine } from '../../types';
import { findClosestCatalogMatch } from '../../services/receiptParser';

interface ReceiptConfirmationProps {
  lines: ParsedReceiptLine[];
  rawText: string;
  catalog: CatalogIngredient[];
  onAccept: (rows: AcceptedRow[]) => Promise<void>;
  onCancel: () => void;
}

export interface AcceptedRow {
  itemName: string;
  quantity: number;
  unit: string;
  price: number;
  catalogIngredientId?: string;
}

interface EditableRow {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  price: string;
  confidence: number;
  checked: boolean;
  catalogIngredientId?: string;
}

const UNIT_OPTIONS = [
  { value: '', label: '(none)' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'l', label: 'l' },
  { value: 'ml', label: 'ml' },
  { value: 'pcs', label: 'pcs' },
  { value: 'pack', label: 'pack' },
  { value: 'sachet', label: 'sachet' },
  { value: 'btl', label: 'btl' },
  { value: 'can', label: 'can' },
  { value: 'box', label: 'box' },
];

export const ReceiptConfirmation: React.FC<ReceiptConfirmationProps> = ({
  lines,
  rawText,
  catalog,
  onAccept,
  onCancel,
}) => {
  const initialRows = useMemo<EditableRow[]>(
    () =>
      lines.map((l, i) => {
        const catId = findClosestCatalogMatch(
          l.itemName,
          catalog.map((c) => ({ id: c.id, normalizedName: c.normalizedName }))
        );
        return {
          id: `row-${i}`,
          itemName: l.itemName,
          quantity: l.quantity != null ? String(l.quantity) : '',
          unit: l.unit || '',
          price: String(l.price),
          confidence: l.confidence,
          checked: l.confidence >= 0.8,
          catalogIngredientId: catId || undefined,
        };
      }),
    [lines, catalog]
  );
  const [rows, setRows] = useState<EditableRow[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const update = (id: string, patch: Partial<EditableRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const toggleAll = () => {
    const allChecked = rows.every((r) => r.checked);
    setRows((rs) => rs.map((r) => ({ ...r, checked: !allChecked })));
  };

  const addEmptyRow = () => {
    setRows((rs) => [
      ...rs,
      {
        id: `row-manual-${Date.now()}`,
        itemName: '',
        quantity: '1',
        unit: 'kg',
        price: '',
        confidence: 1,
        checked: true,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const handleAccept = async () => {
    setSaving(true);
    try {
      const accepted: AcceptedRow[] = rows
        .filter((r) => r.checked)
        .map((r) => ({
          itemName: r.itemName.trim(),
          quantity: Number(r.quantity) || 1,
          unit: r.unit || 'pcs',
          price: Number(r.price) || 0,
          catalogIngredientId: r.catalogIngredientId,
        }))
        .filter((r) => r.itemName && r.price > 0);
      await onAccept(accepted);
    } finally {
      setSaving(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="bg-white p-xl rounded-xl border border-border-base shadow-sm">
        <div className="flex items-start gap-md">
          <AlertTriangle className="w-5 h-5 text-rust mt-xs" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="text-lg font-medium text-ink-900">
              No items found in this receipt
            </h2>
            <p className="text-ink-500 text-sm mt-xs">
              The photo may be blurry or the receipt format wasn&apos;t recognized.
              You can copy lines from the raw text below and add them manually.
            </p>
            <textarea
              readOnly
              value={rawText}
              className="mt-md w-full h-40 text-xs font-mono p-sm border border-border-base rounded-md bg-surface"
            />
            <div className="flex gap-sm mt-md">
              <Button variant="secondary" onClick={onCancel}>
                Try another photo
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const checkedCount = rows.filter((r) => r.checked).length;
  const confidentCount = rows.filter((r) => r.confidence >= 0.8).length;

  return (
    <div className="bg-white p-xl rounded-xl border border-border-base shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-md mb-md">
        <div>
          <h2 className="text-xl font-medium text-ink-900">Review items</h2>
          <p className="text-sm text-ink-500 mt-xs">
            Found {lines.length} line{lines.length === 1 ? '' : 's'}. {confidentCount}{' '}
            look confident.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleAll}>
          {rows.every((r) => r.checked) ? 'Uncheck all' : 'Check all'}
        </Button>
      </div>

      <div className="space-y-sm">
        {rows.map((row) => {
          const matched = row.catalogIngredientId
            ? catalog.find((c) => c.id === row.catalogIngredientId)
            : null;
          const isManual = row.id.startsWith('row-manual-');
          return (
            <div
              key={row.id}
              className={`grid grid-cols-12 gap-sm items-end p-sm rounded-md border ${
                row.checked ? 'border-border-base' : 'border-border-subtle bg-surface/30'
              }`}
            >
              <button
                type="button"
                onClick={() => update(row.id, { checked: !row.checked })}
                aria-label={row.checked ? 'Skip this row' : 'Include this row'}
                className="col-span-1 flex items-center justify-center mb-sm"
              >
                {row.checked ? (
                  <CheckCircle2 className="w-5 h-5 text-moss" />
                ) : (
                  <Circle className="w-5 h-5 text-ink-400" />
                )}
              </button>
              <div className="col-span-5">
                <Input
                  label="Item"
                  hideLabel
                  value={row.itemName}
                  onChange={(e) => update(row.id, { itemName: e.target.value })}
                  placeholder="Item name"
                />
                {matched && (
                  <p className="text-[10px] text-moss mt-xs">
                    Linked to: {matched.name}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Input
                  label="Qty"
                  hideLabel
                  type="number"
                  value={row.quantity}
                  onChange={(e) => update(row.id, { quantity: e.target.value })}
                  placeholder="Qty"
                  min={0}
                />
              </div>
              <div className="col-span-2">
                <Select
                  label="Unit"
                  hideLabel
                  value={row.unit}
                  onChange={(e) => update(row.id, { unit: e.target.value })}
                  options={UNIT_OPTIONS}
                />
              </div>
              <div className="col-span-2 flex items-end gap-xs">
                <Input
                  label="Price"
                  hideLabel
                  type="number"
                  value={row.price}
                  onChange={(e) => update(row.id, { price: e.target.value })}
                  currency
                  min={0}
                />
                {isManual && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove this row"
                    className="text-ink-400 hover:text-rust px-xs pb-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addEmptyRow}
          className="w-full border border-dashed border-border-base rounded-md py-sm text-sm text-ink-500 hover:bg-surface-hover hover:text-clay flex items-center justify-center gap-xs"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add another item (manually)
        </button>
      </div>

      <div className="mt-md">
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-ink-500 underline"
        >
          {showRaw ? 'Hide' : 'Show'} raw OCR text
        </button>
        {showRaw && (
          <textarea
            readOnly
            value={rawText}
            className="mt-sm w-full h-32 text-xs font-mono p-sm border border-border-base rounded-md bg-surface"
          />
        )}
      </div>

      <div className="flex gap-sm justify-end mt-lg">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAccept}
          isLoading={saving}
          disabled={checkedCount === 0}
        >
          Add {checkedCount} to catalog
        </Button>
      </div>
    </div>
  );
};
