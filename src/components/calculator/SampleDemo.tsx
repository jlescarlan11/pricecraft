import React from 'react';
import { PlayCircle, Info, ArrowRight, PieChart } from 'lucide-react';
import { Card, Button } from '../shared';
import { COOKIE_SAMPLE } from '../../constants';
import { performFullCalculation } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';

interface SampleDemoProps {
  onLoadSample: () => void;
}

export const SampleDemo: React.FC<SampleDemoProps> = ({ onLoadSample }) => {
  const sampleResults = performFullCalculation(COOKIE_SAMPLE.input, COOKIE_SAMPLE.config);

  return (
    <Card noPadding className="bg-surface border-clay/30 relative shadow-md hover:shadow-lg transition-shadow duration-500 overflow-visible group">
      {/* Decorative background element */}
      <div className="absolute inset-0 bg-gradient-to-br from-clay/5 via-transparent to-moss/5 rounded-xl pointer-events-none" />
      
      <div className="absolute -top-4 -right-4 md:top-0 md:right-0 p-lg opacity-10 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
        <PieChart className="w-24 h-24 md:w-32 md:h-32 text-clay" />
      </div>

      <div className="flex flex-col lg:flex-row gap-lg md:gap-xl items-start lg:items-center p-lg md:p-xl relative z-10">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-sm md:gap-md mb-md">
            <span className="bg-clay text-white text-[10px] font-bold px-sm py-[2px] rounded-full uppercase tracking-wider shadow-sm">
              New to pricing?
            </span>
            <h3 className="text-lg text-ink-900 font-semibold">
              See how it works
            </h3>
          </div>
          <p className="text-ink-700 text-sm md:text-base mb-lg leading-relaxed font-medium max-w-xl">
            Not sure where to start? Load our <span className="text-clay font-bold">Artisan Cookie Case Study</span> to see a perfectly balanced calculation for a batch of 50 cookies.
          </p>

          <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 gap-sm md:gap-md">
            <div className="bg-white/60 backdrop-blur-sm p-sm md:p-md rounded-lg border border-border-subtle/50 shadow-sm">
              <p className="text-[10px] uppercase text-ink-500 font-bold tracking-wider mb-xs">
                Total Cost
              </p>
              <p className="text-sm md:text-base font-bold text-ink-900">
                {formatCurrency(sampleResults.totalCost)}
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-sm md:p-md rounded-lg border border-border-subtle/50 shadow-sm">
              <p className="text-[10px] uppercase text-ink-500 font-bold tracking-wider mb-xs">
                Cost/Unit
              </p>
              <p className="text-sm md:text-base font-bold text-ink-900">
                {formatCurrency(sampleResults.costPerUnit)}
              </p>
            </div>
            <div className="bg-clay/10 border border-clay/20 p-sm md:p-md rounded-lg relative overflow-hidden shadow-sm">
              <p className="text-[10px] uppercase text-clay font-bold tracking-wider mb-xs relative z-10">
                Target Price
              </p>
              <p className="text-sm md:text-base font-bold text-clay relative z-10">
                {formatCurrency(sampleResults.recommendedPrice)}
              </p>
            </div>
            <div className="bg-moss/10 border border-moss/20 p-sm md:p-md rounded-lg relative overflow-hidden shadow-sm">
              <p className="text-[10px] uppercase text-moss font-bold tracking-wider mb-xs relative z-10">
                Profit/Batch
              </p>
              <p className="text-sm md:text-base font-bold text-moss relative z-10">
                {formatCurrency(sampleResults.profitPerBatch)}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 w-full lg:w-auto flex flex-col gap-md pt-md lg:pt-0 border-t border-border-subtle lg:border-t-0">
          <Button
            onClick={onLoadSample}
            variant="primary"
            className="w-full flex items-center justify-center gap-sm h-14 md:h-16 px-xl text-lg font-bold tracking-tight rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 bg-clay text-white border-none group-hover:bg-clay/90"
          >
            <PlayCircle className="w-6 h-6" />
            Load Sample Data
            <ArrowRight className="w-5 h-5 ml-xs group-hover:translate-x-1 transition-transform" />
          </Button>
          <div className="flex items-center justify-center gap-sm text-[10px] md:text-xs text-ink-500 font-bold uppercase tracking-widest">
            <Info className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-50" />
            Fills the form instantly
          </div>
        </div>
      </div>
    </Card>
  );
};
