import React, { useMemo, useState } from 'react';
import { Plus, Calculator, RefreshCcw, Package, ArrowRight, Trash2 } from 'lucide-react';
import {
  ProductInfo,
  IngredientRow,
  LaborCost,
  OverheadCost,
  PricingStrategy,
  CurrentPrice,
  SampleDemo,
} from './index';
import { AccordionSection } from './AccordionSection';
import { VariantBlock } from './VariantBlock';
import { SavePresetButton } from '../presets/SavePresetButton';
import { Button, Card, Switch, Input } from '../shared';
import { performFullCalculation } from '../../utils/calculations';
import type { CalculationInput, PricingConfig, Ingredient, Variant } from '../../types/calculator';

interface CalculatorFormProps {
  input: CalculationInput;
  config: PricingConfig;
  errors: Record<string, string>;
  isCalculating: boolean;
  onUpdateInput: (updates: Partial<CalculationInput>) => void;
  onUpdateIngredient: (id: string, field: keyof Ingredient, value: string | number | boolean) => void;
  onAddIngredient: () => void;
  onRemoveIngredient: (id: string) => void;
  onUpdateConfig: (updates: Partial<PricingConfig>) => void;
  onCalculate: () => void;
  onReset: () => void;
  onOpenPresets: () => void;
  onLoadSample?: () => void;

  // Variant Actions
  onSetHasVariants: (enabled: boolean) => void;
  onAddVariant: () => void;
  onRemoveVariant: (id: string) => void;
  onUpdateVariant: (id: string, updates: Partial<Variant>) => void;
  onUpdateVariantIngredient: (
    variantId: string,
    ingredientId: string,
    field: keyof Ingredient,
    value: string | number | boolean
  ) => void;
  onAddVariantIngredient: (variantId: string) => void;
  onRemoveVariantIngredient: (variantId: string, ingredientId: string) => void;

  catalogItems?: import('../../types').CatalogIngredient[];
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({
  input,
  config,
  errors,
  isCalculating,
  onUpdateInput,
  onUpdateIngredient,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateConfig,
  onCalculate,
  onReset,
  onOpenPresets,
  onLoadSample,
  onSetHasVariants,
  onAddVariant,
  onRemoveVariant,
  onUpdateVariant,
  onUpdateVariantIngredient,
  onAddVariantIngredient,
  onRemoveVariantIngredient,
  catalogItems = [],
}) => {
  // --- Empty State Logic ---
  const isEmpty = useMemo(() => {
    const hasName = (input.productName?.trim().length ?? 0) > 0;
    const hasIngredients = (input.ingredients?.length ?? 0) > 1 || 
      (input.ingredients?.[0]?.name?.trim().length ?? 0) > 0 ||
      (input.ingredients?.[0]?.cost ?? 0) > 0;
    const hasLabor = (input.laborCost ?? 0) > 0;
    const hasOverhead = (input.overhead ?? 0) > 0;
    
    return !hasName && !hasIngredients && !hasLabor && !hasOverhead;
  }, [input]);

  // --- Completion Logic ---
  const isInfoComplete =
    (input.productName?.trim().length ?? 0) >= 3 && (input.batchSize ?? 0) >= 1;

  const isIngredientsComplete =
    (input.ingredients?.length ?? 0) > 0 &&
    input.ingredients!.every(
      (ing) => (ing.name?.trim() || '') !== '' && (ing.cost || 0) > 0
    );

  // Costs and Strategy are always considered "visitable/complete" as they have defaults or are optional
  const isCostsComplete = true;
  const isStrategyComplete = true;

  // Variants are optional, so "complete" if valid or empty
  const isVariantsComplete = true; 

  const isFormValid = isInfoComplete && isIngredientsComplete;

  // --- Accordion State ---
  // Initialize to the first incomplete step
  const [expandedSection, setExpandedSection] = useState<number>(() => {
    if (!isInfoComplete) return 1;
    if (!isIngredientsComplete) return 2;
    return 3; 
  });

  // Helper to handle manual toggling
  const toggleSection = (section: number) => {
    setExpandedSection((prev) => (prev === section ? 0 : section));
  };

  // Helper to advance to next section
  const nextSection = (currentSection: number) => {
    setExpandedSection(currentSection + 1);
  };

  const handleProductInfoChange = (
    field: 'productName' | 'batchSize' | 'businessName',
    value: string | number
  ) => {
    onUpdateInput({ [field]: value });
  };

  const handleLaborChange = (value: number) => {
    onUpdateInput({ laborCost: value });
  };

  const handleOverheadChange = (value: number) => {
    onUpdateInput({ overhead: value });
  };

  const handlePricingChange = (strategy: PricingConfig['strategy'], value: number) => {
    onUpdateConfig({ strategy, value });
  };

  const handleCurrentPriceChange = (value?: number) => {
    onUpdateInput({ currentSellingPrice: value });
  };

  // Calculate remaining batch for variants
  const totalVariantBatch = input?.variants?.reduce((sum, v) => sum + v.batchSize, 0) || 0;
  const rawRemainingBatch = (input?.batchSize || 0) - totalVariantBatch;
  const remainingBatch = Math.max(0, rawRemainingBatch);

  // Perform calculation to get live previews for variants
  const calculationResult = useMemo(() => performFullCalculation(input, config), [input, config]);

  // Summaries for closed states
  const infoSummary = isInfoComplete ? `${input.productName}, Batch: ${input.batchSize}` : 'Incomplete';
  const ingredientsSummary = isIngredientsComplete 
    ? `${input.ingredients?.length} Ingredients` 
    : `${input.ingredients?.length || 0} items`;
  const costsSummary = `Labor: ${input.laborCost || 0}, Overhead: ${input.overhead || 0}`;
  const strategySummary = `${config.strategy === 'markup' ? 'Markup' : 'Margin'}: ${config.value}%`;

  return (
    <div className="flex flex-col gap-5 w-full pb-24">
      {/* Header with Actions */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-y-2 md:gap-y-0 items-center">
        {/* Title */}
        <div className="flex flex-col">
          <h2 className="text-lg text-ink-900 font-semibold">Build your recipe</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Step {Math.min(expandedSection || 1, 5)} of 5
          </p>
        </div>

        {/* Action Bar */}
        <div className="md:col-start-2 md:justify-self-end mt-2 md:mt-0 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-surface p-0.5 rounded-md border border-border-subtle w-full md:w-fit">
            <Button
              variant="ghost"
              onClick={onOpenPresets}
              className="flex-1 md:flex-none h-auto py-1 md:h-9 md:py-0 px-1 md:px-3 text-ink-700 hover:text-clay hover:bg-clay/5 min-w-0 flex flex-col md:flex-row gap-0.5 md:gap-2 items-center justify-center"
              title="Saved Products"
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="text-[10px] md:text-sm font-medium md:font-normal leading-none md:leading-normal truncate w-full md:w-auto text-center">Presets</span>
            </Button>

            <div className="h-4 w-px bg-border-subtle shrink-0" />

            <div className="flex-1 md:flex-none flex justify-center min-w-0 [&>button]:h-auto [&>button]:py-1 [&>button]:md:h-9 [&>button]:md:py-0 [&>button]:px-1 [&>button]:md:px-3 [&>button]:text-ink-700 [&>button:hover]:text-clay [&>button:hover]:bg-clay/5 [&>button]:w-full [&>button]:md:w-auto [&>button]:min-w-0">
              <SavePresetButton
                input={input}
                config={config}
                disabled={!isFormValid}
                variant="ghost"
                className="w-full justify-center"
                mobileLabelLayout="vertical"
              />
            </div>

            <div className="h-4 w-px bg-border-subtle shrink-0" />

            <Button
              variant="ghost"
              onClick={onReset}
              className="flex-1 md:flex-none h-auto py-1 md:h-9 md:py-0 px-1 md:px-3 text-ink-700 hover:text-rust hover:bg-rust/5 min-w-0 flex flex-col md:flex-row gap-0.5 md:gap-2 items-center justify-center"
              title="Reset Form"
            >
              <RefreshCcw className="w-4 h-4 shrink-0" />
              <span className="text-[10px] md:text-sm font-medium md:font-normal leading-none md:leading-normal truncate w-full md:w-auto text-center">Reset</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-md">
        {isEmpty && onLoadSample && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 pb-sm">
             <SampleDemo onLoadSample={onLoadSample} />
          </div>
        )}
        {/* Step 1: Product Info */}
        <AccordionSection
          title="Product Details"
          stepNumber={1}
          isOpen={expandedSection === 1}
          isComplete={isInfoComplete}
          onToggle={() => toggleSection(1)}
          summary={infoSummary}
        >
          <div className="space-y-lg">
            <ProductInfo
              businessName={input?.businessName}
              productName={input?.productName || ''}
              batchSize={input?.batchSize || 0}
              onChange={handleProductInfoChange}
              errors={{
                businessName: errors.businessName,
                productName: errors.productName,
                batchSize: errors.batchSize,
              }}
            />
            <div className="flex justify-end">
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => nextSection(1)} 
                disabled={!isInfoComplete}
                className="bg-clay text-white hover:bg-clay/90"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </AccordionSection>

        {/* Step 2: Ingredients */}
        <AccordionSection
          title="Ingredients"
          stepNumber={2}
          isOpen={expandedSection === 2}
          isComplete={isIngredientsComplete}
          onToggle={() => toggleSection(2)}
          summary={ingredientsSummary}
        >
          <div className="space-y-lg">
             <div className="bg-surface/50 rounded-lg p-sm border border-border-subtle/50">
               <p className="text-sm text-ink-500 text-center">
                 Add all ingredients used in your batch (e.g., 500g Flour, 2 Eggs).
               </p>
             </div>

            {errors.ingredients && (
              <div className="p-md bg-rust/10 text-rust text-sm rounded-md border border-rust/20 flex items-center gap-sm animate-in fade-in slide-in-from-left-2">
                <Trash2 className="w-4 h-4" />
                <span className="font-medium">{errors.ingredients}</span>
              </div>
            )}

            <div className="flex flex-col space-y-4 md:space-y-0 md:divide-y md:divide-border-subtle">
              {input?.ingredients?.map((ing, index) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  index={index}
                  isOnlyRow={input?.ingredients?.length === 1}
                  onUpdate={onUpdateIngredient}
                  onRemove={onRemoveIngredient}
                  onAdd={onAddIngredient}
                  autoFocus={index === (input?.ingredients?.length || 0) - 1 && index > 0}
                  catalogItems={catalogItems}
                  errors={{
                    name: errors[`ingredients.${ing.id}.name`],
                    purchaseQuantity: errors[`ingredients.${ing.id}.purchaseQuantity`],
                    purchaseCost: errors[`ingredients.${ing.id}.purchaseCost`],
                    recipeQuantity: errors[`ingredients.${ing.id}.recipeQuantity`],
                    cost: errors[`ingredients.${ing.id}.cost`],
                  }}
                />
              ))}
            </div>

            <div className="pt-sm space-y-lg">
              <Button
                variant="dashed"
                onClick={onAddIngredient}
                className="w-full flex items-center justify-center gap-sm"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </Button>
              
              <div className="flex justify-end">
                 <Button 
                  variant="primary"
                  size="sm"
                  onClick={() => nextSection(2)}
                  disabled={!isIngredientsComplete}
                  className="bg-clay text-white hover:bg-clay/90"
                 >
                   Continue <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* Step 3: Costs */}
        <AccordionSection
          title="Labor & Overhead"
          stepNumber={3}
          isOpen={expandedSection === 3}
          isComplete={isCostsComplete}
          onToggle={() => toggleSection(3)}
          summary={costsSummary}
        >
           <div className="space-y-lg -mx-lg -mb-lg -mt-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-border-subtle/50">
              <div className="p-lg md:p-xl">
                <LaborCost
                  value={input?.laborCost || 0}
                  onChange={handleLaborChange}
                  error={errors.laborCost}
                />
              </div>
              <div className="p-lg md:p-xl">
                <OverheadCost
                  value={input?.overhead || 0}
                  batchSize={input?.batchSize || 1}
                  onChange={handleOverheadChange}
                  error={errors.overhead}
                />
              </div>
            </div>
            <div className="px-lg md:px-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <Input
                  label="Packaging cost (per batch)"
                  type="number"
                  value={input?.packagingCost ?? ''}
                  onChange={(e) =>
                    onUpdateInput({ packagingCost: Number(e.target.value) || 0 })
                  }
                  currency
                  min={0}
                  step="0.01"
                  helperText="Boxes, bags, stickers, etc."
                />
                <Input
                  label="Platform / commission fee"
                  type="number"
                  value={input?.platformFeePercent ?? ''}
                  onChange={(e) =>
                    onUpdateInput({
                      platformFeePercent: Number(e.target.value) || 0,
                    })
                  }
                  suffix="%"
                  min={0}
                  step="0.1"
                  helperText="GrabFood, Shopee, Lazada, etc."
                />
              </div>
            </div>
            <div className="flex justify-end p-lg md:p-xl pt-0 md:pt-0">
               <Button 
                variant="primary"
                size="sm"
                onClick={() => nextSection(3)}
                className="bg-clay text-white hover:bg-clay/90"
               >
                 Continue <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
            </div>
          </div>
        </AccordionSection>

        {/* Step 4: Pricing Strategy */}
        <AccordionSection
          title="Pricing Strategy"
          stepNumber={4}
          isOpen={expandedSection === 4}
          isComplete={isStrategyComplete}
          onToggle={() => toggleSection(4)}
          summary={strategySummary}
        >
           <div className="space-y-lg">
              <PricingStrategy
                strategy={config.strategy}
                value={config.value}
                costPerUnit={calculationResult?.costPerUnit || 0}
                onChange={handlePricingChange}
              />

              <div className="h-px bg-border-subtle" role="separator" />

              <CurrentPrice value={input.currentSellingPrice} onChange={handleCurrentPriceChange} />

              <div className="h-px bg-border-subtle" role="separator" />

              <div className="space-y-md">
                <Switch
                  checked={!!input.wholesale?.enabled}
                  onChange={(checked) =>
                    onUpdateInput({
                      wholesale: {
                        enabled: checked,
                        minUnits: input.wholesale?.minUnits ?? 12,
                        strategy: input.wholesale?.strategy ?? config.strategy,
                        value: input.wholesale?.value ?? Math.max(0, config.value - 15),
                      },
                    })
                  }
                  label="Add a wholesale price tier"
                />
                {input.wholesale?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <Input
                      label="Min units"
                      type="number"
                      value={input.wholesale.minUnits}
                      onChange={(e) =>
                        onUpdateInput({
                          wholesale: {
                            ...input.wholesale!,
                            minUnits: Number(e.target.value) || 0,
                          },
                        })
                      }
                      min={1}
                    />
                    <Input
                      label="Wholesale markup/margin"
                      type="number"
                      value={input.wholesale.value}
                      onChange={(e) =>
                        onUpdateInput({
                          wholesale: {
                            ...input.wholesale!,
                            value: Number(e.target.value) || 0,
                          },
                        })
                      }
                      suffix="%"
                      min={0}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                 <Button 
                  variant="primary"
                  size="sm"
                  onClick={() => nextSection(4)}
                  className="bg-clay text-white hover:bg-clay/90"
                 >
                   Continue <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              </div>
          </div>
        </AccordionSection>

         {/* Step 5: Variants (Optional) */}
         <AccordionSection
          title="Variants (Optional)"
          stepNumber={5}
          isOpen={expandedSection === 5}
          isComplete={isVariantsComplete}
          onToggle={() => toggleSection(5)}
          summary={input.hasVariants ? `${input.variants?.length || 0} Variants` : 'Disabled'}
        >
          <div className="space-y-lg">
             <div className="flex items-center justify-between bg-surface-hover/30 px-lg py-md rounded-xl border border-border-subtle min-h-[56px] transition-colors hover:bg-surface-hover/50">
                <div className="flex flex-col gap-0.5">
                  <h4 id="variants-toggle-label" className="font-medium text-ink-900">Variants</h4>
                  <p className="text-sm text-ink-500 leading-tight">
                    Create product variations from this base recipe
                  </p>
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={!!input.hasVariants}
                    onChange={onSetHasVariants}
                    aria-labelledby="variants-toggle-label"
                    className="p-3 -mr-3"
                  />
                </div>
             </div>

             {errors.variants && (
                <div className="p-md bg-rust/10 text-rust text-sm rounded-md border border-rust/20 mb-lg">
                  {errors.variants}
                </div>
             )}

             {input.hasVariants && (
              <div className="space-y-xl animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Base Variant Block (Read Only) */}
                <Card className="bg-surface/50 border-border-subtle ">
                  <div className="flex flex-col gap-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-ink-900">
                          {input.productName || 'Base Product'} (Base)
                        </h4>
                        <p className="text-sm text-ink-500">Remaining Base Batch</p>
                      </div>
                      <div className="text-2xl font-bold text-ink-900 tabular-nums">
                        {remainingBatch}{' '}
                        <span className="text-sm font-normal text-ink-500">units</span>
                      </div>
                    </div>

                    {/* Visual Allocation Bar */}
                    <div className="space-y-sm">
                      <div className="flex justify-between text-[10px] font-bold text-ink-500 uppercase tracking-widest">
                        <span>Batch Allocation</span>
                        <span>
                          {totalVariantBatch} / {input.batchSize} Units allocated
                        </span>
                      </div>
                      <div className="h-4 w-full bg-border-subtle rounded-lg overflow-hidden flex border border-border-subtle shadow-inner">
                        <div
                          className="h-full bg-clay transition-all duration-500 flex items-center justify-center text-[8px] text-white font-bold"
                          style={{ width: `${(remainingBatch / (input.batchSize || 1)) * 100}%` }}
                        >
                          {remainingBatch > 0 && 'BASE'}
                        </div>
                        {input.variants?.map((v, i) => (
                          <div
                            key={v.id}
                            className={`h-full transition-all duration-500 flex items-center justify-center text-[8px] text-white font-bold border-l border-white/20 ${i % 2 === 0 ? 'bg-moss' : 'bg-ink-700'}`}
                            style={{ width: `${(v.batchSize / (input.batchSize || 1)) * 100}%` }}
                          >
                            {v.batchSize > (input.batchSize || 0) * 0.1 && `V${i + 1}`}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-md items-center text-[10px] font-medium text-ink-500">
                        <div className="flex items-center gap-xs">
                          <div className="w-2 h-2 rounded-full bg-clay" />
                          <span>Base ({remainingBatch})</span>
                        </div>
                        {input.variants?.map((v, i) => (
                          <div key={v.id} className="flex items-center gap-xs">
                            <div
                              className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-moss' : 'bg-ink-700'}`}
                            />
                            <span>
                              {v.name || `Variant ${i + 1}`} ({v.batchSize})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Variants List */}
                {input.variants?.map((variant, index) => {
                  const variantResult = calculationResult.variantResults?.find(
                    (r) => r.id === variant.id
                  );
                  const variantCostPerUnit = variantResult?.costPerUnit || 0;

                  return (
                    <VariantBlock
                      key={variant.id}
                      variant={variant}
                      index={index}
                      remainingBatch={rawRemainingBatch}
                      costPerUnit={variantCostPerUnit}
                      onUpdate={onUpdateVariant}
                      onRemove={onRemoveVariant}
                      onUpdateIngredient={onUpdateVariantIngredient}
                      onAddIngredient={onAddVariantIngredient}
                      onRemoveIngredient={onRemoveVariantIngredient}
                      errors={errors}
                    />
                  );
                })}

                {/* Add Variant Button */}
                <Button
                  variant="dashed"
                  onClick={onAddVariant}
                  disabled={remainingBatch <= 0}
                  className="w-full py-lg flex items-center justify-center gap-sm"
                >
                  <Plus className="w-5 h-5" />
                  {remainingBatch > 0 ? 'Add Variant' : 'No Batch Capacity Remaining'}
                </Button>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedSection(0)} // Close
                className="text-ink-500 hover:text-ink-900"
              >
                Close Section
              </Button>
            </div>
          </div>
        </AccordionSection>

      </div>

      {/* Main Calculate Action — shown below the form on sm-xl. At xl+ the
          side panel's Calculate button takes over so we don't duplicate. */}
      <div className="hidden sm:block xl:hidden mt-6">
        <Button
          variant="primary"
          size="lg"
          onClick={onCalculate}
          isLoading={isCalculating}
          className="w-full"
        >
          <Calculator className="w-4 h-4" />
          Calculate price
        </Button>
      </div>
    </div>
  );
};
