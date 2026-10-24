import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, Select } from '../shared';
import type { CatalogIngredient, ParsedReceiptLine } from '../../types';
import type { ReceiptReview, ReceiptReviewRow } from '../../types/receiptDataset';
import { findClosestCatalogMatch } from '../../services/receiptParser';

interface ReceiptConfirmationProps {
  lines: ParsedReceiptLine[];
  rawText: string;
  catalog: CatalogIngredient[];
  image?: Blob;
  initialReview?: ReceiptReview;
  onAccept: (rows: AcceptedRow[], review: ReceiptReview) => Promise<void>;
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
  sourceIndex: number | null;
  itemName: string;
  quantity: string;
  unit: string;
  price: string;
  label: ReceiptReviewRow['label'];
  checked: boolean;
  catalogIngredientId?: string;
}
const UNIT_OPTIONS = [
  '',
  'kg',
  'g',
  'l',
  'ml',
  'pcs',
  'pack',
  'sachet',
  'btl',
  'can',
  'box',
  'dozen',
].map((value) => ({ value, label: value || '(unknown)' }));
const REVIEW_OPTIONS = [
  { value: 'unreviewed', label: 'Needs review' },
  { value: 'product', label: 'Product' },
  { value: 'not-product', label: 'Not a product' },
];
const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

export const ReceiptConfirmation: React.FC<ReceiptConfirmationProps> = ({
  lines,
  rawText,
  catalog,
  image,
  initialReview,
  onAccept,
  onCancel,
}) => {
  const [rows, setRows] = useState<EditableRow[]>(() =>
    initialReview
      ? initialReview.rows.map((row) => ({
          id: row.id,
          sourceIndex: row.sourceIndex,
          itemName: row.values.itemName,
          quantity: row.values.quantity == null ? '' : String(row.values.quantity),
          unit: row.values.unit || '',
          price: row.values.price == null ? '' : String(row.values.price),
          label: row.label,
          // Reviewing history must not automatically add purchases a second time.
          checked: false,
          catalogIngredientId: findClosestCatalogMatch(row.values.itemName, catalog) || undefined,
        }))
      : lines.map((line, index) => ({
          id: `row-${index}`,
          sourceIndex: index,
          itemName: line.itemName,
          quantity: line.quantity != null ? String(line.quantity) : '',
          unit: line.unit || '',
          price: String(line.price),
          label: 'unreviewed',
          checked: false,
          catalogIngredientId: findClosestCatalogMatch(line.itemName, catalog) || undefined,
        }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [wholeReceiptChecked, setWholeReceiptChecked] = useState(initialReview?.complete || false);
  const [imageUrl, setImageUrl] = useState('');
  const pendingReview = useRef<ReceiptReview | null>(null);
  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const update = (id: string, patch: Partial<EditableRow>) => {
    pendingReview.current = null;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };
  const handleAccept = async () => {
    setError('');
    const reviewedRows: ReceiptReviewRow[] = rows.map((row) => ({
      id: row.id,
      sourceIndex: row.sourceIndex,
      label: row.label,
      includeInCatalog: row.label === 'product' && row.checked,
      values: {
        itemName: row.itemName.trim(),
        quantity: numberOrNull(row.quantity),
        unit: row.unit || null,
        price: numberOrNull(row.price),
      },
    }));
    for (const row of reviewedRows) {
      if (row.label !== 'product') continue;
      const { itemName, quantity, unit, price } = row.values;
      if (!itemName || price === null || !Number.isFinite(price) || price < 0) {
        setError('Each product needs a name and a valid price.');
        return;
      }
      if (
        (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) ||
        (row.includeInCatalog && (quantity === null || !unit))
      ) {
        setError(
          'Enter a positive purchase quantity and unit for each product added to the catalog.'
        );
        return;
      }
    }
    const accepted: AcceptedRow[] = reviewedRows
      .filter((row) => row.includeInCatalog)
      .map((row) => ({
        itemName: row.values.itemName,
        quantity: row.values.quantity!,
        unit: row.values.unit!,
        price: row.values.price!,
        catalogIngredientId: rows.find((editable) => editable.id === row.id)?.catalogIngredientId,
      }));
    const review = pendingReview.current ?? {
      id: crypto.randomUUID(),
      reviewedAt: new Date().toISOString(),
      complete: wholeReceiptChecked && reviewedRows.every((row) => row.label !== 'unreviewed'),
      rows: reviewedRows,
    };
    pendingReview.current = review;
    setSaving(true);
    try {
      await onAccept(accepted, review);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not save. Your edits are still here; please retry.'
      );
    } finally {
      setSaving(false);
    }
  };
  const checkedCount = rows.filter((row) => row.label === 'product' && row.checked).length;
  return (
    <div className="card p-6">
      <h2 className="text-xl font-medium text-ink-900">Review items</h2>
      <p className="text-sm text-ink-500 mt-xs mb-md">
        Found {lines.length} lines. Check each against the photo and label it. Choosing not to add a
        product to your catalog does not reject it from the receipt.
      </p>
      {imageUrl && (
        <details className="mb-md">
          <summary className="cursor-pointer text-sm">View receipt photo</summary>
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img
              src={imageUrl}
              alt="Receipt being reviewed"
              className="mt-sm max-h-[600px] max-w-full object-contain"
            />
          </a>
        </details>
      )}
      {lines.length === 0 && (
        <p className="text-sm text-rust mb-md">
          No items found. Add the missing products manually, or save this scan for later review.
        </p>
      )}
      <fieldset disabled={saving} className="space-y-sm min-w-0">
        {rows.map((row) => (
          <div key={row.id} className="border border-border-base p-sm space-y-sm">
            <div className="grid grid-cols-2 md:grid-cols-12 gap-sm items-end">
              <div className="col-span-2 md:col-span-5">
                <Input
                  label="Item"
                  value={row.itemName}
                  onChange={(event) =>
                    update(row.id, { itemName: event.target.value, catalogIngredientId: undefined })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Qty"
                  type="number"
                  min={0}
                  step="any"
                  value={row.quantity}
                  onChange={(event) => update(row.id, { quantity: event.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Select
                  label="Unit"
                  value={row.unit}
                  options={UNIT_OPTIONS}
                  onChange={(event) => update(row.id, { unit: event.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-3">
                <Input
                  label="Price"
                  type="number"
                  min={0}
                  step="0.01"
                  currency
                  value={row.price}
                  onChange={(event) => update(row.id, { price: event.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-md items-center">
              <div className="w-44">
                <Select
                  label="Review label"
                  value={row.label}
                  options={REVIEW_OPTIONS}
                  onChange={(event) => {
                    const label = event.target.value as ReceiptReviewRow['label'];
                    update(row.id, { label, checked: label === 'product' });
                  }}
                />
              </div>
              <label className="text-sm flex items-center gap-sm">
                <input
                  type="checkbox"
                  checked={row.checked}
                  disabled={row.label !== 'product' || saving}
                  aria-label={`Add ${row.itemName || 'item'} to catalog`}
                  onChange={(event) => update(row.id, { checked: event.target.checked })}
                />
                Add to catalog
              </label>
              {row.catalogIngredientId && (
                <span className="text-xs text-moss">
                  Linked to: {catalog.find((item) => item.id === row.catalogIngredientId)?.name}
                </span>
              )}
              {row.sourceIndex === null && (
                <button
                  type="button"
                  aria-label="Remove this row"
                  className="text-sm text-rust"
                  onClick={() => {
                    pendingReview.current = null;
                    setRows((current) => current.filter((item) => item.id !== row.id));
                  }}
                >
                  Remove added item
                </button>
              )}
            </div>
            {row.sourceIndex !== null && (
              <p className="text-xs text-ink-500 whitespace-pre-wrap">
                OCR: {lines[row.sourceIndex].rawText || '(Source text unavailable)'}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          className="w-full border border-dashed border-border-base py-sm text-sm flex items-center justify-center gap-xs"
          onClick={() => {
            pendingReview.current = null;
            setRows((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                sourceIndex: null,
                itemName: '',
                quantity: '',
                unit: '',
                price: '',
                label: 'product',
                checked: true,
              },
            ]);
          }}
        >
          <Plus className="w-4 h-4" />
          Add another item (manually)
        </button>
        <label className="flex items-start gap-sm text-sm py-md">
          <input
            type="checkbox"
            checked={wholeReceiptChecked}
            onChange={(event) => {
              pendingReview.current = null;
              setWholeReceiptChecked(event.target.checked);
            }}
          />
          I checked the whole receipt and added any missing products.
        </label>
        <p className="text-xs text-ink-500">
          Use the product name as printed. Qty and unit describe the total amount purchased, such as
          400 g for two 200 g packs. Incomplete reviews are saved but excluded from training
          exports.
        </p>
        <button
          type="button"
          className="text-xs text-ink-500 underline"
          onClick={() => setShowRaw((value) => !value)}
        >
          {showRaw ? 'Hide' : 'Show'} raw OCR text
        </button>
        {showRaw && (
          <textarea
            aria-label="Raw OCR text"
            readOnly
            value={rawText}
            className="w-full h-40 text-xs font-mono p-sm border border-border-base bg-surface"
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-sm justify-end pt-md">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAccept} isLoading={saving}>
            {checkedCount ? `Save review and add ${checkedCount} to catalog` : 'Save review'}
          </Button>
        </div>
      </fieldset>
    </div>
  );
};
