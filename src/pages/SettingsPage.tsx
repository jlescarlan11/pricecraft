import React from 'react';
import { Button, Input, Select, Switch, PageHeader } from '../components/shared';
import { useSettings, CURRENCY_OPTIONS } from '../context/SettingsContext';

interface NavItem {
  id: string;
  label: string;
}

const NAV: NavItem[] = [
  { id: 'general', label: 'General' },
  { id: 'pricing', label: 'Pricing defaults' },
  { id: 'tax', label: 'Tax (VAT)' },
  { id: 'reset', label: 'Reset' },
];

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Tune the defaults that apply across PriceCraft."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-8 max-w-4xl">
        {/* Section nav */}
        <nav
          className="hidden lg:block sticky top-20 self-start"
          aria-label="Settings sections"
        >
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block px-3 py-1.5 rounded-md text-sm text-ink-500 hover:text-ink-900 hover:bg-surface transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div className="space-y-6 min-w-0">
          <section id="general" className="card p-6 space-y-4 scroll-mt-20">
            <header>
              <h2 className="text-base font-semibold text-ink-900">General</h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Currency and appearance.
              </p>
            </header>
            <Select
              label="Currency"
              value={settings.currency}
              onChange={(e) =>
                updateSettings({
                  currency: e.target.value as typeof settings.currency,
                })
              }
              options={CURRENCY_OPTIONS.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
            />
            <Select
              label="Theme"
              value={settings.theme}
              onChange={(e) =>
                updateSettings({ theme: e.target.value as typeof settings.theme })
              }
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Match system' },
              ]}
            />
          </section>

          <section id="pricing" className="card p-6 space-y-4 scroll-mt-20">
            <header>
              <h2 className="text-base font-semibold text-ink-900">
                Pricing defaults
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Used when starting a new recipe.
              </p>
            </header>
            <Select
              label="Default pricing strategy"
              value={settings.defaultStrategy}
              onChange={(e) =>
                updateSettings({
                  defaultStrategy: e.target.value as typeof settings.defaultStrategy,
                })
              }
              options={[
                { value: 'markup', label: 'Markup %' },
                { value: 'margin', label: 'Profit margin %' },
              ]}
            />
            <Input
              label="Default markup / margin (%)"
              type="number"
              value={settings.defaultMarkup}
              onChange={(e) =>
                updateSettings({ defaultMarkup: Number(e.target.value) || 0 })
              }
              suffix="%"
              min={0}
              step={1}
            />
          </section>

          <section id="tax" className="card p-6 space-y-4 scroll-mt-20">
            <header>
              <h2 className="text-base font-semibold text-ink-900">
                Tax (VAT)
              </h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Apply tax to recommended prices.
              </p>
            </header>
            <Switch
              checked={settings.vatEnabled}
              onChange={(checked) => updateSettings({ vatEnabled: checked })}
              label="Apply VAT to recommended prices"
            />
            {settings.vatEnabled && (
              <>
                <Input
                  label="VAT rate (%)"
                  type="number"
                  value={settings.vatPercent}
                  onChange={(e) =>
                    updateSettings({ vatPercent: Number(e.target.value) || 0 })
                  }
                  suffix="%"
                  min={0}
                  step={0.1}
                />
                <Switch
                  checked={settings.vatInclusive}
                  onChange={(checked) =>
                    updateSettings({ vatInclusive: checked })
                  }
                  label="Display VAT-inclusive prices (otherwise VAT is shown separately)"
                />
              </>
            )}
          </section>

          <section id="reset" className="card p-6 scroll-mt-20">
            <header className="mb-3">
              <h2 className="text-base font-semibold text-ink-900">Reset</h2>
              <p className="text-sm text-ink-500 mt-0.5">
                Restore all settings to defaults. Doesn&apos;t touch your recipes
                or catalog.
              </p>
            </header>
            <Button
              variant="ghost"
              className="text-rust-700 hover:bg-rust-50"
              onClick={() => {
                if (confirm('Reset all settings to defaults?')) resetSettings();
              }}
            >
              Reset settings
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
};
