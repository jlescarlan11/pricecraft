import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Package } from 'lucide-react';
import { CalculatorForm } from '../components/calculator';
import { ResultsDisplay, StickySummary, CalculatorSidePanel } from '../components/results';
import { PresetsList } from '../components/presets';
import { Modal, PageHeader, useToast } from '../components/shared';
import { DriftBanner } from '../components/drift';
import { COOKIE_SAMPLE } from '../constants';
import { useCalculatorState } from '../hooks';
import { useCatalog } from '../hooks/use-catalog';
import { usePresets } from '../hooks/use-presets';
import { computeDriftFromPresets } from '../services/driftService';
import { enrichWithVatAndWholesale } from '../utils/calculations';
import { useSettings } from '../context/SettingsContext';
import { triggerHapticFeedback } from '../utils/haptics';
import { formatCurrency } from '../utils/formatters';
import type { Preset } from '../types';

export const CalculatorPage: React.FC = () => {
  const { addToast } = useToast();
  const {
    input,
    config,
    results,
    liveResult,
    isDirty,
    errors,
    isCalculating,
    updateInput,
    updateIngredient,
    addIngredient,
    removeIngredient,
    updateConfig,
    calculate,
    reset,
    loadPreset,
    setHasVariants,
    addVariant,
    removeVariant,
    updateVariant,
    updateVariantIngredient,
    addVariantIngredient,
    removeVariantIngredient,
  } = useCalculatorState();

  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [showStickySummary, setShowStickySummary] = useState(false);
  const [driftDismissed, setDriftDismissed] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { items: catalog } = useCatalog();
  const { presets } = usePresets();
  const { settings } = useSettings();
  const driftEntries = useMemo(
    () => computeDriftFromPresets(catalog, presets),
    [catalog, presets]
  );
  const enrichedResults = useMemo(
    () =>
      results
        ? enrichWithVatAndWholesale(results, input, {
            vatEnabled: settings.vatEnabled,
            vatPercent: settings.vatPercent,
            vatInclusive: settings.vatInclusive,
          })
        : results,
    [results, input, settings]
  );
  const enrichedLiveResult = useMemo(
    () =>
      liveResult
        ? enrichWithVatAndWholesale(liveResult, input, {
            vatEnabled: settings.vatEnabled,
            vatPercent: settings.vatPercent,
            vatInclusive: settings.vatInclusive,
          })
        : liveResult,
    [liveResult, input, settings]
  );
  const affectedPresetCount = useMemo(() => {
    const ids = new Set<string>();
    driftEntries.forEach((e) =>
      e.affectedPresets.forEach((p) => ids.add(p.presetId))
    );
    return ids.size;
  }, [driftEntries]);

  const showResults = !!results;

  // Handle sticky summary visibility
  useEffect(() => {
    const handleScroll = () => {
      // Handle Visibility Logic
      // Case 1: Results exist (committed)
      if (showResults && resultsRef.current) {
        const resultsRect = resultsRef.current.getBoundingClientRect();
        // Results are visible if their top is within viewport
        const isResultsVisible = resultsRect.top < window.innerHeight && resultsRect.bottom > 0;
        setShowStickySummary(!isResultsVisible);
        return;
      }

      // Case 2: No results yet, but we have live data (user is typing)
      if (!showResults && liveResult && liveResult.totalCost > 0) {
        setShowStickySummary(true);
        return;
      }

      setShowStickySummary(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [showResults, liveResult]);

  const handleCalculate = async () => {
    const res = await calculate();
    if (res) {
      triggerHapticFeedback(50);
      addToast('✓ Calculation complete', 'success');
      // Scroll to results at the top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear the form? This will remove all your progress.')) {
      reset();
      // Scroll to top to see fresh form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadSample = useCallback(() => {
    loadPreset({
      id: 'sample',
      name: 'Sample Cookie',
      presetType: 'default',
      baseRecipe: COOKIE_SAMPLE.input,
      pricingConfig: COOKIE_SAMPLE.config,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Smooth scroll to form area
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loadPreset]);

  const handleLoadPreset = useCallback(
    (preset: Preset) => {
      loadPreset(preset);
      setIsPresetsModalOpen(false);
      // Scroll to results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [loadPreset]
  );

  const handleEditPreset = useCallback(
    (preset: Preset) => {
      loadPreset(preset);
      setIsPresetsModalOpen(false);
      // Scroll to form
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    },
    [loadPreset]
  );

  return (
    <>
      <div className="animate-in fade-in duration-700 relative">
        {/* The runway begins at the top of the workspace, matching the
            decision-first composition of the selected direction. */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5 2xl:gap-7 items-start">
          <div className="min-w-0">
            <PageHeader
              bare
              eyebrow="Recipe workspace"
              title={input.productName || 'Build a profitable recipe'}
              description="Cost the batch, test the margin, and commit a price you can defend."
            >
              <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 border-y border-border-base bg-bg-elevated">
                <WorkspaceMetric label="Batch size" value={`${input.batchSize || 0} units`} />
                <WorkspaceMetric
                  label="Cost per unit"
                  value={enrichedLiveResult ? formatCurrency(enrichedLiveResult.costPerUnit) : '—'}
                />
                <WorkspaceMetric label="Strategy" value={`${config.value}% ${config.strategy}`} />
                <WorkspaceMetric
                  label="Pricing state"
                  value={showResults ? (isDirty ? 'Changed' : 'Committed') : 'Draft'}
                  signal={showResults && !isDirty}
                />
              </dl>
            </PageHeader>

            {!driftDismissed && affectedPresetCount > 0 && (
              <div className="mb-6">
                <DriftBanner
                  affectedCount={affectedPresetCount}
                  onDismiss={() => setDriftDismissed(true)}
                />
              </div>
            )}

            <div ref={formRef} id="calculator-form" className="min-w-0 bg-bg-elevated border border-border-base">
              <CalculatorForm
                input={input}
                config={config}
                errors={errors}
                isCalculating={isCalculating}
                onUpdateInput={updateInput}
                onUpdateIngredient={updateIngredient}
                onAddIngredient={addIngredient}
                onRemoveIngredient={removeIngredient}
                onUpdateConfig={updateConfig}
                onCalculate={handleCalculate}
                onReset={handleReset}
                onSetHasVariants={setHasVariants}
                onAddVariant={addVariant}
                onRemoveVariant={removeVariant}
                onUpdateVariant={updateVariant}
                onUpdateVariantIngredient={updateVariantIngredient}
                onAddVariantIngredient={addVariantIngredient}
                onRemoveVariantIngredient={removeVariantIngredient}
                onOpenPresets={() => setIsPresetsModalOpen(true)}
                onLoadSample={handleLoadSample}
                catalogItems={catalog}
              />
            </div>
          </div>

          <CalculatorSidePanel
            results={enrichedLiveResult}
            hasCommittedResults={showResults}
            isStale={isDirty}
            isCalculating={isCalculating}
            onCalculate={handleCalculate}
            onScrollToResults={handleScrollToResults}
          />
        </div>

        {showResults && (
          <div
            ref={resultsRef}
            className="mt-12 pt-10 border-t border-ink-900 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <ResultsDisplay
              results={enrichedResults}
              input={input}
              config={config}
              onEdit={handleScrollToForm}
            />
          </div>
        )}
      </div>

      <StickySummary
        results={enrichedLiveResult}
        hasCommittedResults={showResults}
        isStale={isDirty}
        onScrollToResults={handleScrollToResults}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
        isVisible={showStickySummary}
      />

      {/* Presets Modal */}
      <Modal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        title={
          <div className="flex items-center gap-sm">
            <Package className="text-signal w-5 h-5" />
            <span>Saved products</span>
          </div>
        }
        maxWidth="max-w-3xl"
      >
        <div className="py-md">
          <PresetsList onLoad={handleLoadPreset} onEdit={handleEditPreset} />
        </div>
      </Modal>
    </>
  );
};

const WorkspaceMetric: React.FC<{
  label: string;
  value: string;
  signal?: boolean;
}> = ({ label, value, signal = false }) => (
  <div className="px-3 sm:px-4 py-3 border-r border-b sm:border-b-0 border-border-base last:border-r-0 min-w-0">
    <dt className="label-caps">{label}</dt>
    <dd className="mt-1.5 font-mono text-xs text-ink-900 truncate flex items-center gap-2">
      {signal && <span className="w-1.5 h-1.5 bg-signal border border-ink-900" aria-hidden="true" />}
      {value}
    </dd>
  </div>
);
