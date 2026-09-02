import React from 'react';
import { PlayCircle, ArrowRight } from 'lucide-react';
import { Button } from '../shared';
import { COOKIE_SAMPLE } from '../../constants';
import { performFullCalculation } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';

interface SampleDemoProps {
  onLoadSample: () => void;
}

export const SampleDemo: React.FC<SampleDemoProps> = ({ onLoadSample }) => {
  const sampleResults = performFullCalculation(COOKIE_SAMPLE.input, COOKIE_SAMPLE.config);

  return (
    <section className="border border-ink-900 bg-surface/55">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="p-4 sm:p-5 lg:border-r border-ink-900">
          <p className="label-caps">Guided example · 50 units</p>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="font-serif text-2xl text-ink-900 leading-tight">Chocolate chip cookies</h3>
              <p className="text-sm text-ink-500 mt-1 max-w-lg">
                Load a complete costing example and inspect how each input changes the final price.
              </p>
            </div>
            <p className="font-mono text-xl text-ink-900 tnum">
              {formatCurrency(sampleResults.recommendedPrice)}
              <span className="block label-caps mt-1">recommended</span>
            </p>
          </div>
          <dl className="hidden sm:grid grid-cols-3 mt-5 border-t border-border-base pt-3 gap-4">
            <SampleMetric label="Batch cost" value={formatCurrency(sampleResults.totalCost)} />
            <SampleMetric label="Cost / unit" value={formatCurrency(sampleResults.costPerUnit)} />
            <SampleMetric label="Profit / batch" value={formatCurrency(sampleResults.profitPerBatch)} />
          </dl>
        </div>
        <Button
          onClick={onLoadSample}
          variant="primary"
          className="h-full min-h-20 w-full justify-between px-5 bg-sidebar text-white border-0 hover:bg-graphite"
        >
          <span className="inline-flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-signal" />
            Load sample data
          </span>
          <ArrowRight className="w-5 h-5 text-signal" />
        </Button>
      </div>
    </section>
  );
};

const SampleMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="label-caps">{label}</dt>
    <dd className="font-mono text-xs text-ink-900 mt-1 tnum">{value}</dd>
  </div>
);
