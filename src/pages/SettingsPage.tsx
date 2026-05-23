import React from 'react';
import { Button, Input, Select, Switch } from '../components/shared';
import { useSettings, CURRENCY_OPTIONS } from '../context/SettingsContext';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div className="space-y-xl max-w-3xl mx-auto">
      <div className="border-b border-border-subtle pb-lg">
        <h1 className="font-serif text-3xl text-ink-900">Settings</h1>
        <p className="text-ink-500 mt-sm">Tune defaults for the calculator.</p>
      </div>

      <section className="bg-white p-xl rounded-xl border border-border-base shadow-sm space-y-lg">
        <h2 className="text-xl font-medium text-ink-900">General</h2>
        <Select
          label="Currency"
          value={settings.currency}
          onChange={(e) =>
            updateSettings({ currency: e.target.value as typeof settings.currency })
          }
          options={CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
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

      <section className="bg-white p-xl rounded-xl border border-border-base shadow-sm space-y-lg">
        <h2 className="text-xl font-medium text-ink-900">Pricing defaults</h2>
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
          onChange={(e) => updateSettings({ defaultMarkup: Number(e.target.value) || 0 })}
          suffix="%"
          min={0}
          step={1}
        />
      </section>

      <section className="bg-white p-xl rounded-xl border border-border-base shadow-sm space-y-lg">
        <h2 className="text-xl font-medium text-ink-900">Tax (VAT)</h2>
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
              onChange={(checked) => updateSettings({ vatInclusive: checked })}
              label="Display VAT-inclusive prices (otherwise VAT is shown separately)"
            />
          </>
        )}
      </section>

      <section className="bg-white p-xl rounded-xl border border-border-base shadow-sm">
        <h2 className="text-xl font-medium text-ink-900 mb-md">Reset</h2>
        <p className="text-ink-500 text-sm mb-md">
          Restore all settings to their defaults. Doesn&apos;t touch your recipes or
          catalog.
        </p>
        <Button
          variant="ghost"
          className="text-rust hover:bg-rust/5"
          onClick={() => {
            if (confirm('Reset all settings to defaults?')) resetSettings();
          }}
        >
          Reset settings
        </Button>
      </section>
    </div>
  );
};
