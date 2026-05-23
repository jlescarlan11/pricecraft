import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'pricing_calculator_settings';

export interface AppSettings {
  currency: 'PHP' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'MYR' | 'IDR';
  defaultMarkup: number;
  defaultStrategy: 'markup' | 'margin';
  theme: 'light' | 'dark' | 'auto';
  vatEnabled: boolean;
  vatPercent: number;
  vatInclusive: boolean;
  onboardingCompleted: boolean;
}

const defaultSettings: AppSettings = {
  currency: 'PHP',
  defaultMarkup: 50,
  defaultStrategy: 'markup',
  theme: 'light',
  vatEnabled: false,
  vatPercent: 12,
  vatInclusive: false,
  onboardingCompleted: false,
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function readFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

function writeToStorage(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function applyTheme(theme: AppSettings['theme']) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;
  if (effective === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => readFromStorage());

  useEffect(() => {
    writeToStorage(settings);
    applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== 'auto') return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('auto');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Safe fallback for unit tests / standalone renders. Reads from storage and
    // ignores updates rather than throwing — keeps components renderable in
    // isolation (mirrors the pattern used by useCatalog).
    return {
      settings: readFromStorage(),
      updateSettings: () => {},
      resetSettings: () => {},
    };
  }
  return ctx;
}

export const CURRENCY_OPTIONS: { value: AppSettings['currency']; label: string; symbol: string }[] = [
  { value: 'PHP', label: 'Philippine Peso (₱)', symbol: '₱' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { value: 'SGD', label: 'Singapore Dollar (S$)', symbol: 'S$' },
  { value: 'MYR', label: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  { value: 'IDR', label: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
];

export function getCurrencySymbol(currency: AppSettings['currency']): string {
  return CURRENCY_OPTIONS.find((o) => o.value === currency)?.symbol || '₱';
}

export function formatMoney(value: number, currency: AppSettings['currency'] = 'PHP'): string {
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${getCurrencySymbol(currency)}${value.toFixed(2)}`;
  }
}
