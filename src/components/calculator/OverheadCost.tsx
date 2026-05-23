import React, { useState } from 'react';
import { Calculator, HelpCircle, AlertCircle } from 'lucide-react';
import { Input, Button, Badge, Modal } from '../shared';
import { OverheadCalculator } from '../help';

interface OverheadCostProps {
  value: number;
  batchSize: number;
  onChange: (value: number) => void;
  error?: string;
  label?: string;
}

export const OverheadCost: React.FC<OverheadCostProps> = ({
  value,
  batchSize,
  onChange,
  error,
  label,
}) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isHelperOpen, setIsHelperOpen] = useState(false);

  const handleApplyOverhead = (calculatedTotal: number) => {
    onChange(calculatedTotal);
    setIsCalculatorOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 leading-tight">
            {label || 'Overhead cost'}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">Rent, utilities, packaging.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHelperOpen(true)}
            aria-label="Overhead guide"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCalculatorOpen(true)}
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Calculator</span>
          </Button>
        </div>
      </div>

      <Input
        label={label ? `Total ${label}` : 'Total overhead cost'}
        hideLabel
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        currency
        placeholder="0.00"
        error={error}
        min={0}
        step="0.01"
      />
      {value === 0 && (
        <Badge variant="warning" className="inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Zero overhead? Rare but possible.
        </Badge>
      )}

      {/* Helper Modal */}
      <Modal
        isOpen={isHelperOpen}
        onClose={() => setIsHelperOpen(false)}
        title="Overhead Cost Guide"
        maxWidth="max-w-[500px]"
      >
        <div className="space-y-xl py-md">
          <div className="space-y-md">
            <p className="text-ink-700 leading-relaxed">
              Overhead includes all indirect costs of running your business. These are bills you pay regardless of how many units you sell.
            </p>
            
            <div className="space-y-lg">
              <div className="space-y-xs">
                <h5 className="font-bold text-ink-900 flex items-center gap-xs">
                  Examples of Fixed Costs:
                </h5>
                <ul className="text-sm list-disc pl-md space-y-xs text-ink-600">
                  <li>Rent for your workspace</li>
                  <li>Electricity, water, and internet</li>
                  <li>Marketing and advertisement fees</li>
                  <li>Equipment maintenance and repairs</li>
                </ul>
              </div>

              <div className="space-y-xs">
                <h5 className="font-bold text-ink-900 flex items-center gap-xs">
                  Packaging & Supplies:
                </h5>
                <p className="text-sm text-ink-600">
                  Don&apos;t forget individual packaging costs like boxes, jars, labels, and pouches which are often overlooked.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-surface p-lg rounded-xl border border-border-subtle">
             <p className="text-sm font-bold text-ink-900 mb-xs">Pro Tip:</p>
             <p className="text-sm text-ink-600 italic">
               &quot;Divide your monthly bills by the average number of batches you make to find the fair overhead share for each batch.&quot;
             </p>
          </div>

          <div className="flex justify-end pt-md">
            <Button variant="primary" onClick={() => setIsHelperOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      {/* Calculator Modal */}
      <Modal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        title="Overhead Calculator"
        maxWidth="max-w-[600px]"
      >
        <OverheadCalculator onApply={handleApplyOverhead} initialBatchSize={batchSize} />
      </Modal>
    </div>
  );
};