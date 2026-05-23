import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Modal, PageHeader, StatCard, EmptyState } from '../components/shared';
import { Receipt as ReceiptIcon } from 'lucide-react';
import { useSales } from '../hooks/use-sales';
import { usePresets } from '../hooks/use-presets';
import { useSettings, formatMoney } from '../context/SettingsContext';
import { performFullCalculation } from '../utils/calculations';
import type { SaleEntry } from '../types';

export const SalesPage: React.FC = () => {
  const { sales, addSale, deleteSale } = useSales();
  const { presets } = usePresets();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState('');
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetCostMap = useMemo(() => {
    const m = new Map<string, { costPerUnit: number; name: string }>();
    for (const p of presets) {
      try {
        const res = performFullCalculation(
          { ...p.baseRecipe, hasVariants: false, variants: [] },
          p.pricingConfig
        );
        m.set(p.id, {
          costPerUnit: res.costPerUnit,
          name: p.baseRecipe.productName || p.name,
        });
      } catch {
        m.set(p.id, { costPerUnit: 0, name: p.name });
      }
    }
    return m;
  }, [presets]);

  const summary = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let units = 0;
    for (const s of sales) {
      revenue += s.unitsSold * s.actualPricePerUnit;
      cost += s.unitsSold * s.actualCostPerUnit;
      units += s.unitsSold;
    }
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, units, profit, margin };
  }, [sales]);

  const resetForm = () => {
    setPresetId('');
    setUnits('');
    setPrice('');
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setNotes('');
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    const u = Number(units);
    const p = Number(price);
    if (!presetId) {
      setError('Choose a recipe.');
      return;
    }
    if (!Number.isFinite(u) || u <= 0) {
      setError('Units sold must be a positive number.');
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      setError('Price must be a positive number.');
      return;
    }
    const presetInfo = presetCostMap.get(presetId);
    if (!presetInfo) {
      setError('Recipe not found.');
      return;
    }
    setSaving(true);
    try {
      await addSale({
        presetId,
        presetName: presetInfo.name,
        unitsSold: u,
        actualPricePerUnit: p,
        actualCostPerUnit: presetInfo.costPerUnit,
        occurredAt: new Date(occurredAt).toISOString(),
        notes: notes.trim() || undefined,
      });
      resetForm();
      setOpen(false);
    } catch (e) {
      console.error(e);
      setError('Could not save the sale.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale entry?')) return;
    await deleteSale(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Sales log"
        description="Track what you sold and what you actually earned."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Log a sale
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Units sold"
          value={summary.units.toLocaleString()}
        />
        <StatCard
          label="Revenue"
          value={formatMoney(summary.revenue, settings.currency)}
        />
        <StatCard
          label="Profit"
          value={formatMoney(summary.profit, settings.currency)}
          tone={summary.profit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Margin"
          value={`${summary.margin.toFixed(1)}%`}
          tone={summary.margin >= 20 ? 'positive' : 'warn'}
        />
      </div>

      {sales.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon className="w-5 h-5" />}
          title="No sales logged yet"
          description="Log your first sale to see real margins next to planned ones."
          action={
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              Log a sale
            </Button>
          }
        />
      ) : (
        <div className="card-flat overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/60 border-b border-border-subtle text-left">
                  <th className="px-4 py-2.5 label-caps">Date</th>
                  <th className="px-4 py-2.5 label-caps">Recipe</th>
                  <th className="px-4 py-2.5 label-caps text-right">Units</th>
                  <th className="px-4 py-2.5 label-caps text-right">Price</th>
                  <th className="px-4 py-2.5 label-caps text-right">Profit</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sales.map((s: SaleEntry) => {
                  const revenue = s.unitsSold * s.actualPricePerUnit;
                  const cost = s.unitsSold * s.actualCostPerUnit;
                  const profit = revenue - cost;
                  return (
                    <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 text-ink-700 text-xs">
                        {new Date(s.occurredAt).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-ink-900 font-medium">
                        {s.presetName}
                      </td>
                      <td className="px-4 py-3 text-right tnum text-ink-700">
                        {s.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-right tnum text-ink-700">
                        {formatMoney(s.actualPricePerUnit, settings.currency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tnum font-medium ${
                          profit >= 0 ? 'text-moss-700' : 'text-rust-700'
                        }`}
                      >
                        {formatMoney(profit, settings.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          aria-label="Delete sale"
                          className="text-rust-700 hover:bg-rust-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Log a sale"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-md">
          <Select
            label="Recipe"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            options={[
              { value: '', label: 'Choose a recipe…' },
              ...presets.map((p) => ({
                value: p.id,
                label: p.baseRecipe.productName || p.name,
              })),
            ]}
          />
          <div className="grid grid-cols-2 gap-md">
            <Input
              label="Units sold"
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              min={0}
              step="any"
            />
            <Input
              label="Price per unit"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              currency
              min={0}
              step="0.01"
            />
          </div>
          <Input
            label="Date"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Saturday market"
          />
          {error && <p className="text-sm text-rust">{error}</p>}
        </div>
      </Modal>
    </div>
  );
};

