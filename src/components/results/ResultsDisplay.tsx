import React from 'react';
import type { CalculationResult, CalculationInput, PricingConfig } from '../../types/calculator';
import { PricingRecommendations } from './PricingRecommendations';
import { CostBreakdown } from './CostBreakdown';
import { PriceComparison } from './PriceComparison';
import { VariantResultsTable } from './VariantResultsTable';
import { ShareResults } from './ShareResults';
import { Button } from '../shared/Button';
import { SavePresetButton } from '../presets/SavePresetButton';
import { Share2, Calculator, Edit2 } from 'lucide-react';
import { getPrintDate, getPrintTitle } from '../../utils';

interface ResultsDisplayProps {
  results: CalculationResult | null | undefined;
  input: CalculationInput;
  config: PricingConfig;
  onEdit?: () => void;
}

/**
 * Orchestrator component that displays all calculation results.
 * Includes recommendations, cost breakdown, and price comparison.
 * Handles empty states and provides utility actions via ShareResults and SavePresetButton.
 */
export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  input,
  config,
  onEdit,
}) => {
  // Placeholder for when no results are available
  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center p-3xl text-center bg-surface rounded-xl border-2 border-dashed border-border-base animate-in fade-in duration-1000">
        <div className="w-20 h-20 bg-bg-main rounded-round flex items-center justify-center mb-xl shadow-level-1 border border-border-subtle">
          <Calculator className="w-10 h-10 text-ink-500" />
        </div>
        <h3 className="text-2xl text-ink-900 mb-sm">Shall we begin?</h3>
        <p className="text-ink-500 max-w-sm mx-auto mb-2xl leading-relaxed font-medium">
          Input your ingredients, labor, and overhead costs to see your recommended selling price
          and profit analysis.
        </p>
        <Button onClick={onEdit} variant="primary" className="gap-sm px-xl py-md">
          <Edit2 className="w-4 h-4" />
          Explore
        </Button>
      </div>
    );
  }

  const hasVariants = results.variantResults && results.variantResults.length > 0;

  return (
    <div className="space-y-2xl animate-in fade-in slide-in-from-bottom-lg duration-1000 ease-out">
      {/* Print-only Header */}
      <div className="hidden print:block border-b border-ink-900 pb-xl mb-3xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl text-ink-900 mb-sm">{getPrintTitle(input)}</h1>
            <h2 className="text-xl font-medium text-ink-700">Product Pricing Report</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-xs">
              Date Generated
            </p>
            <p className="text-xl font-bold text-ink-900 tracking-tight">{getPrintDate()}</p>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-lg print:hidden">
        <div>
          <h2 className="text-3xl font-serif text-ink-900">Results</h2>
          <p className="text-sm text-ink-500 mt-xs font-medium">
            Analysis for{' '}
            <span className="text-ink-900">{input.productName || 'Unnamed Product'}</span>
          </p>
        </div>
        <div className="flex items-center gap-sm w-full sm:w-auto">
          <SavePresetButton
            input={input}
            config={config}
            variant="primary"
            size="sm"
            className="flex-1 sm:flex-none"
          />
          <ShareResults results={results} input={input} />
        </div>
      </div>

      <div className="flex flex-col gap-2xl max-w-4xl mx-auto">
        {/* Priority 1: Results Table (Variants) or Recommendations (Single) */}
        <div className="print:break-inside-avoid animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {hasVariants ? (
            <VariantResultsTable results={results} />
          ) : (
            <PricingRecommendations results={results} />
          )}
        </div>

        {/* Priority 2: Cost Breakdown - De-emphasized */}
        <div className="print:break-inside-avoid animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 opacity-80 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-sm mb-md px-md">
            <div className="h-px flex-1 bg-border-subtle" />
            <span className="text-[10px] font-bold text-ink-300 uppercase tracking-[0.2em]">Detailed Cost Breakdown</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
          <CostBreakdown results={results} />
        </div>

        {/* Priority 3: Price Comparison (Single Only) - De-emphasized */}
        {!hasVariants && (
          <div className="print:break-inside-avoid animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-sm mb-md px-md">
              <div className="h-px flex-1 bg-border-subtle" />
              <span className="text-[10px] font-bold text-ink-300 uppercase tracking-[0.2em]">Current vs Recommended</span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>
            <PriceComparison
              currentPrice={input.currentSellingPrice}
              recommendedPrice={results.recommendedPrice}
              costPerUnit={results.costPerUnit}
              batchSize={input.batchSize}
            />
          </div>
        )}

        {(results.vatAmount !== undefined || results.wholesalePrice !== undefined) && (
          <div className="p-lg bg-white rounded-xl border border-border-base shadow-sm print:hidden">
            <h4 className="text-sm font-bold text-ink-900 mb-md uppercase tracking-wide">
              Tax &amp; tier
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md text-sm">
              {results.vatAmount !== undefined && (
                <div>
                  <p className="text-ink-500">VAT amount</p>
                  <p className="font-mono text-ink-900 mt-xs">
                    ₱{results.vatAmount.toFixed(2)}
                    {results.priceWithVat !== undefined && (
                      <span className="text-ink-500 ml-xs">
                        (gross ₱{results.priceWithVat.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {results.wholesalePrice !== undefined && (
                <div>
                  <p className="text-ink-500">Wholesale price</p>
                  <p className="font-mono text-ink-900 mt-xs">
                    ₱{results.wholesalePrice.toFixed(2)}
                    {input.wholesale?.minUnits ? (
                      <span className="text-ink-500 ml-xs">
                        (min {input.wholesale.minUnits})
                      </span>
                    ) : null}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pro Tip - Low visual weight */}
        <div className="p-xl bg-surface/50 rounded-xl border border-border-subtle print:hidden flex items-start gap-md">
          <div className="p-sm bg-clay/10 rounded-round text-clay shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink-900 mb-xs">
              Pro Tip: Optimize your Batch Size
            </h4>
            <p className="text-ink-500 text-sm leading-relaxed">
              Small adjustments to your batch size or ingredient sourcing can have a huge impact on
              your final profit margin. Try experimenting with different batch sizes to find your
              &quot;sweet spot&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-2xl pt-xl border-t border-border-subtle text-center text-ink-500 text-xs font-medium">
        <p>This pricing report was generated using PriceCraft.</p>
        <p className="mt-xs">
          Values are estimates based on user-provided costs and selected pricing strategies.
        </p>
      </div>
    </div>
  );
};
