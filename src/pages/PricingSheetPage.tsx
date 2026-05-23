import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button, PageHeader } from '../components/shared';
import { usePresets } from '../hooks/use-presets';
import { useSettings, formatMoney } from '../context/SettingsContext';
import { performFullCalculation, enrichWithVatAndWholesale } from '../utils/calculations';
import type { Preset } from '../types';

export const PricingSheetPage: React.FC = () => {
  const navigate = useNavigate();
  const { presets } = usePresets();
  const { settings } = useSettings();
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [businessNameOverride, setBusinessNameOverride] = useState<string | null>(null);

  const businessName =
    businessNameOverride ?? presets[0]?.baseRecipe?.businessName ?? '';

  const rows = useMemo(() => {
    return presets
      .filter((p) => !excludedIds.has(p.id))
      .map((preset: Preset) => {
        const base = preset.baseRecipe;
        const result = performFullCalculation(
          {
            ...base,
            hasVariants: false,
            variants: [],
          },
          preset.pricingConfig
        );
        const enriched = enrichWithVatAndWholesale(result, base, {
          vatEnabled: settings.vatEnabled,
          vatPercent: settings.vatPercent,
          vatInclusive: settings.vatInclusive,
        });
        return {
          id: preset.id,
          name: base.productName || preset.name,
          unit: 'per unit',
          retailPrice: enriched.priceWithVat ?? enriched.recommendedPrice,
          vatAmount: enriched.vatAmount,
          wholesalePrice: enriched.wholesalePrice,
          wholesaleMinUnits: base.wholesale?.minUnits,
        };
      });
  }, [presets, excludedIds, settings]);

  const toggle = (id: string) => {
    setExcludedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Output"
          title="Pricing sheet"
          description="Choose recipes, then print or save as PDF for customers and staff."
          actions={
            <>
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" aria-hidden="true" />
                Print / Save as PDF
              </Button>
            </>
          }
        />
      </div>

      <div className="print:hidden bg-white p-lg rounded-xl border border-border-base shadow-sm space-y-md">
        <h2 className="text-lg font-medium text-ink-900">Choose recipes</h2>
        {presets.length === 0 ? (
          <p className="text-ink-500 text-sm">
            Save some recipes first to build a pricing sheet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-xs">
            {presets.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-sm py-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!excludedIds.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="text-sm text-ink-900">
                    {p.baseRecipe.productName || p.name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessNameOverride(e.target.value)}
          placeholder="Business name (shown on the sheet)"
          className="w-full border border-border-base rounded-md px-sm py-xs text-sm"
        />
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-2xl rounded-xl border border-border-base shadow-sm print:border-0 print:shadow-none print:p-0 print:rounded-none print-sheet">
        <header className="text-center border-b border-border-subtle pb-md mb-lg">
          <h1 className="font-serif text-3xl text-ink-900">
            {businessName || 'Pricing sheet'}
          </h1>
          <p className="text-ink-500 text-sm mt-xs">
            As of{' '}
            {new Date().toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="text-center text-ink-500 py-2xl">
            Select recipes above to include them here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-base text-left">
                <th className="py-sm pr-md font-medium text-ink-900">Item</th>
                <th className="py-sm pr-md font-medium text-ink-900 text-right">
                  Retail
                </th>
                <th className="py-sm pr-md font-medium text-ink-900 text-right">
                  Wholesale
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle">
                  <td className="py-sm pr-md text-ink-900">{r.name}</td>
                  <td className="py-sm pr-md text-right font-mono text-ink-900">
                    {formatMoney(r.retailPrice, settings.currency)}
                    {r.vatAmount !== undefined && !settings.vatInclusive && (
                      <span className="block text-xs text-ink-500">
                        incl. VAT {formatMoney(r.vatAmount, settings.currency)}
                      </span>
                    )}
                  </td>
                  <td className="py-sm pr-md text-right font-mono text-ink-700">
                    {r.wholesalePrice !== undefined
                      ? `${formatMoney(r.wholesalePrice, settings.currency)}${
                          r.wholesaleMinUnits ? ` (min ${r.wholesaleMinUnits})` : ''
                        }`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className="mt-2xl text-center text-xs text-ink-500 print:mt-xl">
          Prices subject to change. Generated with PriceCraft.
        </footer>
      </div>
    </div>
  );
};
