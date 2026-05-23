import React, { useState } from 'react';
import { Calculator, HelpCircle } from 'lucide-react';
import { Input, Button, Modal } from '../shared';

interface LaborCostProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  label?: string;
}

export const LaborCost: React.FC<LaborCostProps> = ({ value, onChange, error, label }) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const [hours, setHours] = useState<string>('');
  const [rate, setRate] = useState<string>('');

  const calculateAndApply = () => {
    const h = parseFloat(hours);
    const r = parseFloat(rate);
    if (!isNaN(h) && !isNaN(r)) {
      onChange(h * r);
      setIsCalculatorOpen(false);
    }
  };

  const calculatedTotal = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 leading-tight">
            {label || 'Labor cost'}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">Pay yourself or your staff.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHelperOpen(true)}
            title="Labor guide"
            aria-label="Labor guide"
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
        label={label ? `Total ${label}` : 'Total labor cost'}
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

      {/* Helper Modal */}
      <Modal
        isOpen={isHelperOpen}
        onClose={() => setIsHelperOpen(false)}
        title="Labor Cost Guide"
        maxWidth="max-w-[450px]"
      >
        <div className="space-y-xl py-md">
          <div className="space-y-md">
            <p className="text-ink-700 leading-relaxed">
              Labor cost represents the value of time spent preparing this batch. Even if you are the only worker, you should pay yourself a fair hourly wage.
            </p>
            
            <div className="space-y-lg">
              <div className="space-y-xs">
                <h5 className="font-bold text-ink-900">Why calculate labor?</h5>
                <p className="text-sm text-ink-600">
                  If you don&apos;t include labor, you&apos;re only covering your ingredients, not your effort. Proper labor pricing allows you to eventually hire staff.
                </p>
              </div>
              
              <div className="space-y-xs">
                <h5 className="font-bold text-ink-900">How to calculate:</h5>
                <p className="text-sm text-ink-600 font-mono bg-surface p-sm rounded-md border border-border-subtle">
                  Time Spent (hrs) × Hourly Rate = Labor Cost
                </p>
              </div>
            </div>
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
        title="Labor Calculator"
        maxWidth="max-w-[450px]"
      >
        <div className="space-y-xl py-md">
          <div className="grid grid-cols-2 gap-lg">
            <Input
              label="Hours Worked"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 4"
              min={0}
              step="0.5"
            />
            <Input
              label="Hourly Rate"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              currency
              placeholder="e.g. 100"
              min={0}
              step="0.01"
            />
          </div>

          <div className="bg-clay-50 rounded-md p-4 border border-clay-100">
            <p className="label-caps">Calculated labor</p>
            <div className="text-2xl font-semibold text-clay-700 tnum mt-1">
              ₱
              {calculatedTotal.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <Button
            variant="primary"
            onClick={calculateAndApply}
            disabled={!hours || !rate}
            type="button"
            className="w-full"
            size="lg"
          >
            Apply
          </Button>
        </div>
      </Modal>
    </div>
  );
};