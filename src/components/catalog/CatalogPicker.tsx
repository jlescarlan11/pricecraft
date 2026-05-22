import React, { useMemo, useState } from 'react';
import { Search, X, Link as LinkIcon } from 'lucide-react';
import type { CatalogIngredient } from '../../types';
import { normalizeIngredientName } from '../../services/receiptParser';

interface CatalogPickerProps {
  items: CatalogIngredient[];
  selectedId?: string;
  onSelect: (item: CatalogIngredient) => void;
  onClear: () => void;
  placeholder?: string;
}

export const CatalogPicker: React.FC<CatalogPickerProps> = ({
  items,
  selectedId,
  onSelect,
  onClear,
  placeholder = 'Link to catalog…',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const matches = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    const q = normalizeIngredientName(query);
    return items
      .filter((i) => i.normalizedName.includes(q))
      .slice(0, 8);
  }, [items, query]);

  if (selected) {
    return (
      <div className="inline-flex items-center gap-xs px-sm py-xs bg-moss/10 text-moss rounded-md text-xs">
        <LinkIcon className="w-3 h-3" aria-hidden="true" />
        <span className="font-medium">{selected.name}</span>
        <button
          type="button"
          onClick={onClear}
          className="hover:text-rust"
          aria-label="Unlink from catalog"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <div className="inline-flex items-center gap-xs border border-border-base rounded-md px-sm py-xs bg-white text-xs">
        <Search className="w-3 h-3 text-ink-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="bg-transparent outline-none w-32 placeholder:text-ink-400"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-xs w-56 bg-white border border-border-base rounded-md shadow-level-2 max-h-56 overflow-y-auto">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery('');
                  setOpen(false);
                }}
                className="w-full text-left px-sm py-xs hover:bg-surface-hover text-xs"
              >
                <span className="font-medium text-ink-900">{item.name}</span>
                <span className="text-ink-400 ml-xs">
                  ₱{item.purchaseCost.toFixed(2)} / {item.purchaseQuantity}
                  {item.purchaseUnit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
