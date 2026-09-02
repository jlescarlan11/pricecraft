import React, { useState } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import { Modal, Button } from '../shared';

interface ImportStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (strategy: 'merge' | 'replace') => void;
  importStats: { total: number };
}

export const ImportStrategyModal: React.FC<ImportStrategyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  importStats,
}) => {
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Strategy"
      maxWidth="max-w-[600px]"
      footer={
        <div className="flex justify-end gap-md">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onConfirm(strategy)}>
            Start Import
          </Button>
        </div>
      }
    >
      <div className="space-y-lg">
        <p className="text-ink-700">
          The backup file contains{' '}
          <span className="font-semibold text-ink-900">{importStats.total} saved products</span>.
          How would you like to import them?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {/* Merge Option */}
          <div
            className={`
              cursor-pointer rounded-lg border-2 p-lg transition-all outline-none
              ${strategy === 'merge' ? 'border-clay bg-surface' : 'border-border-base bg-bg-elevated hover:border-clay/50'}
            `}
            onClick={() => setStrategy('merge')}
            role="radio"
            aria-checked={strategy === 'merge'}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setStrategy('merge')}
          >
            <div className="mb-md p-sm bg-bg-main rounded-full w-fit">
              <Layers className="w-6 h-6 text-clay" />
            </div>
            <h3 className="font-serif font-semibold text-ink-900 mb-xs">Merge & Add</h3>
            <p className="text-sm text-ink-500">
              Keep existing products. New products will be added, and duplicates will be updated.
            </p>
          </div>

          {/* Replace Option */}
          <div
            className={`
              cursor-pointer rounded-lg border-2 p-lg transition-all outline-none
              ${strategy === 'replace' ? 'border-rust bg-surface' : 'border-border-base bg-bg-elevated hover:border-rust/50'}
            `}
            onClick={() => setStrategy('replace')}
            role="radio"
            aria-checked={strategy === 'replace'}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setStrategy('replace')}
          >
            <div className="mb-md p-sm bg-bg-main rounded-full w-fit">
              <Trash2 className="w-6 h-6 text-rust" />
            </div>
            <h3 className="font-serif font-semibold text-ink-900 mb-xs">Replace All</h3>
            <p className="text-sm text-ink-500">
              <span className="font-bold text-rust">Warning:</span> Deletes all current products
              before importing. This cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
