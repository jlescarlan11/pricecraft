import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Package } from 'lucide-react';
import { CalculatorForm } from '../components/calculator';
import { ResultsDisplay, StickySummary } from '../components/results';
import { PresetsList } from '../components/presets';
import { Modal, useToast } from '../components/shared';
import { DriftBanner } from '../components/drift';
import { COOKIE_SAMPLE } from '../constants';
import { useCalculatorState } from '../hooks';
import { useCatalog } from '../hooks/use-catalog';
import { usePresets } from '../hooks/use-presets';
import { computeDriftFromPresets } from '../services/driftService';
import { enrichWithVatAndWholesale } from '../utils/calculations';
import { useSettings } from '../context/SettingsContext';
import { triggerHapticFeedback } from '../utils/haptics';
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
        {!driftDismissed && affectedPresetCount > 0 && (
          <div className="mb-md">
            <DriftBanner
              affectedCount={affectedPresetCount}
              onDismiss={() => setDriftDismissed(true)}
            />
          </div>
        )}
        {/* Intro Section (only when no results and form is empty) */}
        {!showResults && (
          <div className="space-y-lg mb-lg md:mb-2xl">
            <div className="p-md md:p-lg bg-clay/5 rounded-xl border border-clay/20 animate-in fade-in slide-in-from-top-4 duration-700">
              <p className="text-ink-900 font-medium mb-xs text-sm md:text-base">
                Welcome to your profit partner.
              </p>
              <p className="text-ink-700 text-xs md:text-sm leading-relaxed">
                Fill in your costs below. We&apos;ll help you find the perfect price to ensure your
                business grows sustainably. Don&apos;t forget to include your labor—your time is
                valuable.
              </p>
            </div>
          </div>
        )}

        {/* Results Section (Top Priority) */}
        {showResults && (
          <div
            ref={resultsRef}
            className="mb-4xl animate-in fade-in slide-in-from-top-8 duration-700"
          >
            <ResultsDisplay
              results={enrichedResults}
              input={input}
              config={config}
              onEdit={handleScrollToForm}
            />

            <div className="h-px bg-border-subtle my-3xl" role="separator" />
          </div>
        )}

        {/* Input Form Section (Secondary Priority) */}
        <div ref={formRef} id="calculator-form" className="min-h-[600px]">
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
            <Package className="text-clay w-5 h-5" />
            <span className="text-ink-900">Saved Products</span>
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
