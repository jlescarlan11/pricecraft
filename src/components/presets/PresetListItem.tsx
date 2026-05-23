import React, { useState, useRef, useEffect } from 'react';
import { FileEdit, Trash2, Play, Calendar, Package, MoreVertical } from 'lucide-react';
import type { Preset } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Button, Card, Badge, Tooltip } from '../shared';

interface PresetListItemProps {
  preset: Preset;
  onLoad: (preset: Preset) => void;
  onEdit: (preset: Preset) => void;
  onDelete: (preset: Preset) => void;
  viewMode?: 'grid' | 'list';
}

/**
 * A list item component for displaying a saved preset with its metadata and actions.
 * Supports 'grid' (detailed card) and 'list' (minimal row) view modes.
 */
export const PresetListItem: React.FC<PresetListItemProps> = ({
  preset,
  onLoad,
  onEdit,
  onDelete,
  viewMode = 'grid',
}) => {
  const { name, baseRecipe, updatedAt, pricingConfig } = preset;
  const productName = baseRecipe?.productName || 'Unnamed Product';
  const batchSize = baseRecipe?.batchSize || 1;
  const ingredients = baseRecipe?.ingredients || [];
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    };

    if (isActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsOpen]);

  if (viewMode === 'list') {
    return (
      <div className="group relative flex items-center justify-between gap-3 px-3 py-2.5 bg-bg-elevated hover:bg-surface rounded-md border border-border-subtle transition-colors">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="p-1.5 bg-clay-50 rounded-md text-clay-700">
            <Package size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-ink-900 truncate" title={name}>
              {name}
            </h4>
            <p className="text-xs text-ink-500 mt-0.5">{formatDate(updatedAt)}</p>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsActionsOpen(!isActionsOpen)}
            aria-label="Actions"
          >
            <MoreVertical size={16} />
          </Button>

          {isActionsOpen && (
            <div className="absolute right-0 mt-1 w-48 origin-top-right bg-bg-elevated border border-border-base rounded-md shadow-level-3 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => {
                    onLoad(preset);
                    setIsActionsOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-sm text-ink-700 hover:bg-surface text-left gap-2 cursor-pointer"
                >
                  <Play size={14} className="fill-current text-clay" />
                  Load into calculator
                </button>
                <button
                  onClick={() => {
                    onEdit(preset);
                    setIsActionsOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-sm text-ink-700 hover:bg-surface text-left gap-2 cursor-pointer"
                >
                  <FileEdit size={14} className="text-ink-400" />
                  Edit name
                </button>
                <div className="border-t border-border-subtle my-1" />
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
                      onDelete(preset);
                    }
                    setIsActionsOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-sm text-rust-700 hover:bg-rust-50 text-left gap-2 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete preset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="group transition-all duration-500 hover:border-clay/50 bg-bg-main hover:bg-surface border-border-subtle shadow-none rounded-xl">
      {/* Header: Name and Date */}
      <div className="flex items-start justify-between gap-sm mb-md">
        <div className="min-w-0">
          <h4 className="text-base font-bold text-ink-900 truncate tracking-tight" title={name}>
            {name}
          </h4>
          <p className="text-[10px] text-ink-500 font-medium flex items-center gap-xs mt-0.5">
            <Calendar size={10} className="opacity-70" />
            {formatDate(updatedAt)}
          </p>
        </div>
        <Badge variant="info" className="text-[9px] uppercase tracking-widest py-0 px-xs shrink-0">
          Saved
        </Badge>
      </div>

      {/* Product Details Section */}
      <div className="space-y-sm mb-md bg-surface/50 p-sm rounded-md border border-border-subtle/50">
        <div className="flex items-center gap-sm text-xs text-ink-700">
          <Package className="w-3.5 h-3.5 text-clay/60 shrink-0" />
          <span className="truncate font-semibold" title={productName || 'Unnamed Product'}>
            {productName || 'Unnamed Product'}
          </span>
        </div>
        <div className="flex items-center gap-sm text-[11px] text-ink-500">
          <span className="font-bold text-ink-900">{batchSize}</span>
          <span>unit{batchSize !== 1 ? 's' : ''} / batch</span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-md text-[9px] uppercase tracking-widest font-bold mb-md">
        <div className="border-r border-border-subtle pr-md">
          <span className="block text-ink-500 mb-xs opacity-70">Ingredients</span>
          <span className="text-ink-900">
            {ingredients.length} item{ingredients.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="pl-md">
          <span className="block text-ink-500 mb-xs opacity-70">Strategy</span>
          <span className="text-ink-900">
            {pricingConfig.strategy} ({pricingConfig.value}%)
          </span>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-sm pt-md border-t border-border-subtle">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onLoad(preset)}
          className="flex-1 flex items-center justify-center gap-sm h-10 px-md font-bold text-[11px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Load
        </Button>
        <Tooltip content="Edit Name">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(preset)}
            className="w-10 h-10 p-0 flex items-center justify-center hover:text-clay transition-colors"
            aria-label="Edit preset name"
          >
            <FileEdit size={16} />
          </Button>
        </Tooltip>
        <Tooltip content="Delete">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
                onDelete(preset);
              }
            }}
            className="w-10 h-10 p-0 flex items-center justify-center text-ink-300 hover:text-rust hover:bg-rust/5 transition-colors"
            aria-label="Delete preset"
          >
            <Trash2 size={16} />
          </Button>
        </Tooltip>
      </div>
    </Card>
  );
};