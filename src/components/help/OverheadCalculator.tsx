import React, { useState, useMemo } from 'react';
import { Input, Button } from '../shared';

interface OverheadCalculatorProps {
  onApply: (total: number) => void;
  initialBatchSize: number;
}

/**
 * OverheadCalculator focuses on calculator inputs and results by breaking down
 * monthly expenses and packaging costs.
 */
export const OverheadCalculator: React.FC<OverheadCalculatorProps> = ({
  onApply,
  initialBatchSize,
}) => {
  const [rent, setRent] = useState<string>('');
  const [utilities, setUtilities] = useState<string>('');
  const [marketing, setMarketing] = useState<string>('');
  const [maintenance, setMaintenance] = useState<string>('');
  const [batchesPerMonth, setBatchesPerMonth] = useState<string>('');
  const [packagingPerUnit, setPackagingPerUnit] = useState<string>('');

  const calculation = useMemo(() => {
    const r = parseFloat(rent) || 0;
    const u = parseFloat(utilities) || 0;
    const m = parseFloat(marketing) || 0;
    const mt = parseFloat(maintenance) || 0;
    const bpm = Math.max(parseFloat(batchesPerMonth) || 1, 1);
    const ppu = parseFloat(packagingPerUnit) || 0;
    const bs = initialBatchSize;

    const fixedTotal = r + u + m + mt;
    const fixedPerBatch = fixedTotal / bpm;
    const packagingTotal = ppu * bs;
    const total = fixedPerBatch + packagingTotal;

    return {
      fixedPerBatch,
      packagingTotal,
      total,
    };
  }, [
    rent,
    utilities,
    marketing,
    maintenance,
    batchesPerMonth,
    packagingPerUnit,
    initialBatchSize,
  ]);

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-lg">
        {/* Section 1: Monthly Costs */}
        <div className="bg-bg-elevated/50 rounded-xl p-lg border border-border-subtle/60 space-y-lg shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-sm">
             <p className="text-[10px] font-bold text-ink-500 uppercase tracking-[0.2em] font-sans">
              1. Monthly Fixed Costs
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <Input
              label="Monthly Rent"
              type="number"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              currency
              placeholder="0"
            />
            <Input
              label="Monthly Utilities"
              type="number"
              value={utilities}
              onChange={(e) => setUtilities(e.target.value)}
              currency
              placeholder="0"
            />
            <Input
              label="Marketing"
              type="number"
              value={marketing}
              onChange={(e) => setMarketing(e.target.value)}
              currency
              placeholder="0"
            />
            <Input
              label="Maintenance"
              type="number"
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
              currency
              placeholder="0"
            />
          </div>
          <div className="pt-sm">
            <Input
              label="Batches per Month"
              type="number"
              value={batchesPerMonth}
              onChange={(e) => setBatchesPerMonth(e.target.value)}
              placeholder="e.g. 20"
            />
          </div>
        </div>

        {/* Section 2: Packaging Costs */}
        <div className="bg-bg-elevated/50 rounded-xl p-lg border border-border-subtle/60 space-y-lg shadow-sm">
           <div className="flex items-center justify-between border-b border-border-subtle pb-sm">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-[0.2em] font-sans">
              2. Packaging & Supplies
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <Input
              label="Packaging per Unit"
              type="number"
              value={packagingPerUnit}
              onChange={(e) => setPackagingPerUnit(e.target.value)}
              currency
              placeholder="0.00"
            />
            <Input
              label="Current Batch Size"
              type="number"
              value={initialBatchSize}
              onChange={() => {}}
              disabled
              placeholder="e.g. 50"
            />
          </div>
        </div>

        {/* Section 3: Result Breakdown */}
        <div className="bg-clay/5 rounded-xl p-lg border border-clay/20 space-y-lg shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-clay uppercase tracking-[0.2em] font-sans">
              3. Allocation Results
            </p>
          </div>
          
          <div className="space-y-sm">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Fixed Cost / Batch</span>
              <span className="font-mono text-ink-900">₱{calculation.fixedPerBatch.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Packaging / Batch</span>
              <span className="font-mono text-ink-900">₱{calculation.packagingTotal.toFixed(2)}</span>
            </div>
            <div className="pt-md mt-sm border-t border-clay/10 flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-ink-500 uppercase tracking-wider">Total Overhead</span>
                <span className="text-xs text-ink-400 italic font-medium">for this entire batch</span>
              </div>
              <span className="text-3xl font-bold text-clay tabular-nums leading-none">
                ₱
                {calculation.total.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Button
        className="w-full h-14 font-bold tracking-tight shadow-md hover:shadow-lg transition-all text-lg"
        variant="primary"
        onClick={() => onApply(calculation.total)}
        disabled={calculation.total <= 0}
      >
        Apply to Overhead Cost
      </Button>
    </div>
  );
};
