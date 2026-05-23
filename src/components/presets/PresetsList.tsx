import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { usePresets } from '../../hooks/use-presets';
import { Input, Button, EmptyState, SkeletonList } from '../shared';
import { Package } from 'lucide-react';
import { PresetListItem } from './PresetListItem';
import type { Preset } from '../../types';

interface PresetsListProps {
  onLoad: (preset: Preset) => void;
  onEdit: (preset: Preset) => void;
}

/**
 * A component that displays a searchable, filterable list of saved presets.
 * Supports both grid and list view modes and sorts by newest first.
 */
export const PresetsList: React.FC<PresetsListProps> = ({ onLoad, onEdit }) => {
  const { presets, deletePreset, syncStatus } = usePresets();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isLoading = syncStatus === 'syncing' && presets.length === 0;

  const filteredPresets = useMemo(() => {
    return presets
      .filter((preset) => {
        const search = searchQuery.toLowerCase();
        return (
          preset.name.toLowerCase().includes(search) ||
          preset.baseRecipe?.productName?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [presets, searchQuery]);

  if (isLoading) {
    return <SkeletonList count={3} />;
  }

  if (presets.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-5 h-5" />}
        title="A clean slate"
        description="Your saved recipes will appear here for easy access."
      />
    );
  }

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-md">
        <div className="w-full">
          <Input
            label="Search Products"
            placeholder="Search by name or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-ink-500 uppercase tracking-[0.2em]">
            View Mode
          </span>
          <div className="flex items-center bg-surface p-xs rounded-md border border-border-subtle">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`p-sm min-w-0 border-0 shadow-none hover:bg-bg-main/50 rounded-sm transition-all duration-300 ${
                viewMode === 'grid'
                  ? 'bg-bg-main shadow-level-1 text-clay'
                  : 'bg-transparent text-ink-500'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`p-sm min-w-0 border-0 shadow-none hover:bg-bg-main/50 rounded-sm transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-bg-main shadow-level-1 text-clay'
                  : 'bg-transparent text-ink-500'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredPresets.length === 0 ? (
        <div className="text-center py-3xl bg-surface rounded-lg border border-border-subtle animate-in fade-in duration-500">
          <Search className="w-12 h-12 text-ink-300 mx-auto mb-md opacity-50" />
          <p className="text-ink-500 font-medium">
            We couldn&apos;t find a match for &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-md text-clay"
          >
            Clear
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-md w-full'
              : 'flex flex-col gap-sm w-full'
          }
        >
          {filteredPresets.map((preset) => (
            <PresetListItem
              key={preset.id}
              preset={preset}
              onLoad={onLoad}
              onEdit={onEdit}
              onDelete={(p) => deletePreset(p.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
