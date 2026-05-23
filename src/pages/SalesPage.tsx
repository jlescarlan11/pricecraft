import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Modal } from '../components/shared';
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
    <div className="space-y-xl max-w-4xl mx-auto">
      <div className="flex items-end justify-between border-b border-border-subtle pb-lg flex-wrap gap-md">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Sales log</h1>
          <p className="text-ink-500 mt-sm">
            Track what you sold and what you actually earned.
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-xs" aria-hidden="true" />
          Log a sale
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <SummaryCard
          label="Units sold"
          value={summary.units.toLocaleString()}
        />
        <SummaryCard
          label="Revenue"
          value={formatMoney(summary.revenue, settings.currency)}
        />
        <SummaryCard
          label="Profit"
          value={formatMoney(summary.profit, settings.currency)}
          tone={summary.profit >= 0 ? 'positive' : 'negative'}
        />
        <SummaryCard
          label="Margin"
          value={`${summary.margin.toFixed(1)}%`}
          tone={summary.margin >= 20 ? 'positive' : 'warn'}
        />
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-2xl border border-dashed border-border-base rounded-xl text-ink-500">
          No sales logged yet. Log your first sale to see real margins.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-border-subtle">
                <th className="py-sm pr-md font-medium">Date</th>
                <th className="py-sm pr-md font-medium">Recipe</th>
                <th className="py-sm pr-md font-medium text-right">Units</th>
                <th className="py-sm pr-md font-medium text-right">Price</th>
                <th className="py-sm pr-md font-medium text-right">Profit</th>
                <th className="py-sm font-medium" />
              </tr>
            </thead>
            <tbody>
              {sales.map((s: SaleEntry) => {
                const revenue = s.unitsSold * s.actualPricePerUnit;
                const cost = s.unitsSold * s.actualCostPerUnit;
                const profit = revenue - cost;
                return (
                  <tr key={s.id} className="border-b border-border-subtle">
                    <td className="py-md pr-md text-ink-700">
                      {new Date(s.occurredAt).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-md pr-md text-ink-900">{s.presetName}</td>
                    <td className="py-md pr-md text-right font-mono">{s.unitsSold}</td>
                    <td className="py-md pr-md text-right font-mono">
                      {formatMoney(s.actualPricePerUnit, settings.currency)}
                    </td>
                    <td
                      className={`py-md pr-md text-right font-mono ${
                        profit >= 0 ? 'text-moss' : 'text-rust'
                      }`}
                    >
                      {formatMoney(profit, settings.currency)}
                    </td>
                    <td className="py-md text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s.id)}
                        aria-label="Delete sale"
                        className="text-rust hover:bg-rust/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

const SummaryCard: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'warn' | 'negative';
}> = ({ label, value, tone = 'neutral' }) => {
  const color =
    tone === 'positive'
      ? 'text-moss'
      : tone === 'negative'
        ? 'text-rust'
        : tone === 'warn'
          ? 'text-clay'
          : 'text-ink-900';
  return (
    <div className="bg-white p-md rounded-xl border border-border-base shadow-sm">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`text-xl font-medium font-mono mt-xs ${color}`}>{value}</p>
    </div>
  );
};
