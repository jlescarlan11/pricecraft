import React, { useState } from 'react';
import { Check, X, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';

interface PricingGuideProps {
  onAction?: () => void;
  showActionButton?: boolean;
  initialTab?: 'markup' | 'margin';
}

export const PricingGuide: React.FC<PricingGuideProps> = ({
  onAction,
  showActionButton = true,
  initialTab = 'markup',
}) => {
  const [activeTab, setActiveTab] = useState<'markup' | 'margin'>(initialTab);

  return (
    <div className="space-y-xl">
      {/* Tabs */}
      <div className="flex p-xs bg-surface rounded-md border border-border-subtle">
        <button
          onClick={() => setActiveTab('markup')}
          className={`flex-1 flex items-center justify-center gap-sm py-md text-sm font-bold rounded-sm transition-all duration-300 ${
            activeTab === 'markup'
              ? 'bg-sidebar text-white shadow-level-1'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Markup
        </button>
        <button
          onClick={() => setActiveTab('margin')}
          className={`flex-1 flex items-center justify-center gap-sm py-md text-sm font-bold rounded-sm transition-all duration-300 ${
            activeTab === 'margin'
              ? 'bg-sidebar text-white shadow-level-1'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Profit Margin
        </button>
      </div>

      {activeTab === 'markup' ? (
        <div className="space-y-xl animate-in fade-in slide-in-from-bottom-xs duration-500">
          {/* Markup Definition */}
          <section>
            <div className="flex items-center gap-sm mb-sm">
              <Badge variant="info" className="text-[10px] uppercase tracking-widest px-sm">
                How it works
              </Badge>
            </div>
            <p className="text-ink-700 leading-relaxed font-medium max-w-[700px]">
              Markup is when you <strong>add a set amount of profit on top of your cost</strong>. It
              is the easiest way to make sure you earn a specific amount for every item you sell.
            </p>
          </section>

          {/* Markup Visual Example */}
          <section className="bg-surface border border-border-subtle rounded-xl p-lg">
            <h4 className="text-[10px] font-bold text-ink-500 mb-lg uppercase tracking-[0.2em]">
              Example: 50% Markup
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg items-center">
              <div className="text-center p-md bg-bg-main rounded-md border border-border-subtle">
                <p className="text-[10px] text-ink-500 font-bold uppercase tracking-wider mb-xs">
                  It costs you
                </p>
                <p className="text-xl font-bold text-ink-900 tracking-tight">₱100.00</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-clay uppercase mb-xs">+ 50% Profit</p>
                <ArrowRight className="h-6 w-6 text-border-base rotate-90 md:rotate-0" />
              </div>
              <div className="text-center p-md bg-sidebar rounded-md shadow-level-1 border border-white/10">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-xs">
                  You sell for
                </p>
                <p className="text-xl font-bold text-white tracking-tight">₱150.00</p>
              </div>
            </div>
            <div className="mt-lg pt-lg border-t border-border-subtle flex justify-between items-center">
              <span className="text-sm text-ink-700 font-bold">Your Take-Home Profit:</span>
              <span className="text-base font-bold text-moss">₱50.00</span>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {/* When to use */}
            <section>
              <h4 className="font-bold text-ink-900 mb-md flex items-center gap-sm tracking-tight">
                Use this when:
              </h4>
              <ul className="space-y-sm text-sm text-ink-700 font-medium">
                <li className="flex gap-sm">
                  <div className="h-1.5 w-1.5 rounded-round bg-clay/40 mt-2 shrink-0" />
                  You are just starting out
                </li>
                <li className="flex gap-sm">
                  <div className="h-1.5 w-1.5 rounded-round bg-clay/40 mt-2 shrink-0" />
                  You make handmade or custom goods
                </li>
                <li className="flex gap-sm">
                  <div className="h-1.5 w-1.5 rounded-round bg-clay/40 mt-2 shrink-0" />
                  You want a simple way to price items
                </li>
              </ul>
            </section>

            {/* Pros & Cons */}
            <section>
              <h4 className="font-bold text-ink-900 mb-md tracking-tight">Good to know</h4>
              <div className="space-y-md">
                <div className="flex gap-sm text-sm font-medium">
                  <Check className="h-4 w-4 text-moss shrink-0 mt-0.5" />
                  <span className="text-ink-700 leading-snug">
                    Very simple math that anyone can do
                  </span>
                </div>
                <div className="flex gap-sm text-sm font-medium">
                  <X className="h-4 w-4 text-rust shrink-0 mt-0.5" />
                  <span className="text-ink-700 leading-snug">
                    Does not look at what others are charging
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-xl animate-in fade-in slide-in-from-bottom-xs duration-500">
          {/* Margin Definition */}
          <section>
            <div className="flex items-center gap-sm mb-sm">
              <Badge variant="success" className="text-[10px] uppercase tracking-widest px-sm">
                How it works
              </Badge>
            </div>
            <p className="text-ink-700 leading-relaxed font-medium max-w-[700px]">
              Profit Margin is <strong>how much of the final price you get to keep</strong>. It
              helps you see how much of every peso you earn is actual profit versus cost.
            </p>
          </section>

          {/* Margin Visual Example */}
          <section className="bg-surface border border-border-subtle rounded-xl p-lg">
            <h4 className="text-[10px] font-bold text-ink-500 mb-lg uppercase tracking-[0.2em]">
              Example: 50% Margin
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg items-center">
              <div className="text-center p-md bg-bg-main rounded-md border border-border-subtle">
                <p className="text-[10px] text-ink-500 font-bold uppercase tracking-wider mb-xs">
                  It costs you
                </p>
                <p className="text-xl font-bold text-ink-900 tracking-tight">₱100.00</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-moss uppercase mb-xs">Keep 50% of Price</p>
                <ArrowRight className="h-6 w-6 text-border-base rotate-90 md:rotate-0" />
              </div>
              <div className="text-center p-md bg-moss rounded-md shadow-level-1 border border-moss/10">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-xs">
                  You sell for
                </p>
                <p className="text-xl font-bold text-white tracking-tight">₱200.00</p>
              </div>
            </div>
            <div className="mt-lg pt-lg border-t border-border-subtle flex justify-between items-center">
              <span className="text-sm text-ink-700 font-bold">Your Take-Home Profit:</span>
              <span className="text-base font-bold text-moss">₱100.00</span>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {/* When to use */}
            <section>
              <h4 className="font-bold text-ink-900 mb-md flex items-center gap-sm tracking-tight">
                Use this when:
              </h4>
              <ul className="space-y-sm text-sm text-ink-700 font-medium">
                <li className="flex gap-sm">
                  <div className="h-1.5 w-1.5 rounded-round bg-moss/40 mt-2 shrink-0" />
                  You want to know your total business health
                </li>
                <li className="flex gap-sm">
                  <div className="h-1.5 w-1.5 rounded-round bg-moss/40 mt-2 shrink-0" />
                  You are selling to stores or wholesalers
                </li>
                <li className="flex gap-sm">
                  <div className="h-1.5 w-1.5 rounded-round bg-moss/40 mt-2 shrink-0" />
                  You want to compare profit to total sales
                </li>
              </ul>
            </section>

            {/* Pros & Cons */}
            <section>
              <h4 className="font-bold text-ink-900 mb-md tracking-tight">Good to know</h4>
              <div className="space-y-md">
                <div className="flex gap-sm text-sm font-medium">
                  <Check className="h-4 w-4 text-moss shrink-0 mt-0.5" />
                  <span className="text-ink-700 leading-snug">
                    Shows exactly how much money you keep
                  </span>
                </div>
                <div className="flex gap-sm text-sm font-medium">
                  <X className="h-4 w-4 text-rust shrink-0 mt-0.5" />
                  <span className="text-ink-700 leading-snug">
                    The math is a bit more difficult
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <section className="pt-xl border-t border-border-subtle">
        <h4 className="font-bold text-ink-900 mb-lg tracking-tight">Quick Comparison</h4>
        <div className="overflow-hidden rounded-xl border border-border-subtle shadow-level-1 bg-bg-main">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface text-ink-500 font-bold text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-lg py-md border-b border-border-subtle">Feature</th>
                <th className="px-lg py-md border-b border-border-subtle">Markup</th>
                <th className="px-lg py-md border-b border-border-subtle">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-medium">
              <tr>
                <td className="px-lg py-md font-bold text-ink-900 bg-surface/30">Starts with</td>
                <td className="px-lg py-md text-ink-700">Your total cost</td>
                <td className="px-lg py-md text-ink-700">Final selling price</td>
              </tr>
              <tr>
                <td className="px-lg py-md font-bold text-ink-900 bg-surface/30">Calculation</td>
                <td className="px-lg py-md text-clay font-mono text-xs">Cost + Extra Profit</td>
                <td className="px-lg py-md text-clay font-mono text-xs">Keep % of Sale</td>
              </tr>
              <tr>
                <td className="px-lg py-md font-bold text-ink-900 bg-surface/30">Best for</td>
                <td className="px-lg py-md text-ink-700">New businesses</td>
                <td className="px-lg py-md text-ink-700">Shops & Wholesalers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {showActionButton && onAction && (
        <div className="flex justify-center pt-md">
          <Button
            onClick={onAction}
            variant="secondary"
            className="px-2xl py-md font-bold tracking-tight rounded-sm"
          >
            Mindfulness Gained
          </Button>
        </div>
      )}
    </div>
  );
};
