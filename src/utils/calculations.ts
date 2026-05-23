import type { Ingredient, PricingStrategy, VariantResult } from '../types/calculator';

/**
 * Rounds a number to a specified number of decimal places.
 * Used internally to ensure consistent currency formatting.
 *
 * @param value - The number to round
 * @param decimals - The number of decimal places (default 2)
 * @returns The rounded number
 */
const round = (value: number, decimals: number = 2): number => {
  return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
};

/**
 * Calculates the total cost of all ingredients.
 * Safely handles empty arrays and validates that costs are non-negative.
 *
 * @param ingredients - Array of ingredients
 * @returns Total cost of ingredients, rounded to 2 decimals
 */
export const calculateTotalIngredientCost = (ingredients: Ingredient[]): number => {
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return 0;
  }

  const total = ingredients.reduce((sum, ingredient) => {
    const cost = Number(ingredient.cost);
    if (isNaN(cost) || cost < 0) {
      return sum; // Skip invalid or negative costs
    }
    return sum + cost;
  }, 0);

  return round(total);
};

/**
 * Calculates the cost per unit by dividing total cost by batch size.
 * Handles division by zero and negative batch sizes.
 *
 * @param totalCost - The total cost of production
 * @param batchSize - The number of units in the batch
 * @returns Cost per unit, rounded to 2 decimals
 */
export const calculateCostPerUnit = (totalCost: number, batchSize: number): number => {
  if (batchSize <= 0) {
    return 0; // Avoid division by zero or negative batch size
  }
  if (totalCost < 0) {
    return 0;
  }
  return round(totalCost / batchSize);
};

/**
 * Calculates the selling price based on Markup percentage.
 * Formula: Cost * (1 + Markup% / 100)
 *
 * @param costPerUnit - The cost to produce one unit
 * @param markupPercent - The desired markup percentage
 * @returns Recommended selling price, rounded to 2 decimals
 */
export const calculateMarkupPrice = (costPerUnit: number, markupPercent: number): number => {
  if (costPerUnit < 0 || markupPercent < 0) {
    return 0;
  }
  const price = costPerUnit * (1 + markupPercent / 100);
  return round(price);
};

/**
 * Calculates the selling price based on Profit Margin percentage.
 * Formula: Cost / (1 - Margin% / 100)
 *
 * @param costPerUnit - The cost to produce one unit
 * @param marginPercent - The desired profit margin percentage
 * @returns Recommended selling price, rounded to 2 decimals. Returns 0 if margin is >= 100.
 */
export const calculateMarginPrice = (costPerUnit: number, marginPercent: number): number => {
  if (costPerUnit < 0 || marginPercent < 0) {
    return 0;
  }
  if (marginPercent >= 100) {
    return 0;
  }
  const price = costPerUnit / (1 - marginPercent / 100);
  return round(price);
};

/**
 * Calculates the recommended selling price based on the selected strategy.
 *
 * @param costPerUnit - The cost to produce one unit
 * @param strategy - The pricing strategy ('markup' or 'margin')
 * @param value - The percentage value for the strategy
 * @returns Recommended selling price, rounded to 2 decimals
 */
export const calculateRecommendedPrice = (
  costPerUnit: number,
  strategy: PricingStrategy,
  value: number
): number => {
  if (strategy === 'markup') {
    return calculateMarkupPrice(costPerUnit, value);
  } else if (strategy === 'margin') {
    return calculateMarginPrice(costPerUnit, value);
  }
  return 0;
};

/**
 * Calculates the actual profit margin percentage given a cost and selling price.
 * Formula: ((Selling Price - Cost) / Selling Price) * 100
 *
 * @param costPerUnit - The cost to produce one unit
 * @param sellingPrice - The actual selling price
 * @returns Profit margin percentage, rounded to 2 decimals
 */
export const calculateProfitMargin = (costPerUnit: number, sellingPrice: number): number => {
  if (sellingPrice <= 0) {
    return 0;
  }
  const margin = ((sellingPrice - costPerUnit) / sellingPrice) * 100;
  return round(margin);
};

/**
 * Performs a complete calculation based on all inputs and configuration.
 *
 * @param input - The calculation inputs (ingredients, labor, overhead, batch size)
 * @param config - The pricing strategy configuration
 * @returns A complete CalculationResult object
 */
export const performFullCalculation = (
  input: import('../types/calculator').CalculationInput,
  config: import('../types/calculator').PricingConfig
): import('../types/calculator').CalculationResult => {
  // 1. Base / Total Batch Calculation
  const ingredientCost = calculateTotalIngredientCost(input.ingredients);
  const packagingCost = Math.max(0, Number(input.packagingCost) || 0);
  const platformFeePercent = Math.max(0, Number(input.platformFeePercent) || 0);
  const totalCost = round(
    ingredientCost + input.laborCost + input.overhead + packagingCost
  );

  // Base Cost Per Unit (Assuming entire batch is base product)
  const baseCostPerUnit = calculateCostPerUnit(totalCost, input.batchSize);

  // Base Recommendation (for reference or if no variants)
  const rawBaseRecommendedPrice = calculateRecommendedPrice(
    baseCostPerUnit,
    config.strategy,
    config.value
  );
  // If selling on a platform that takes a percentage, gross up the list price
  // so the seller nets the same margin.
  const platformDivisor = 1 - platformFeePercent / 100;
  const baseRecommendedPrice =
    platformFeePercent > 0 && platformDivisor > 0
      ? round(rawBaseRecommendedPrice / platformDivisor)
      : rawBaseRecommendedPrice;

  const baseProfitPerUnit = round(baseRecommendedPrice - baseCostPerUnit);
  const baseProfitMarginPercent = calculateProfitMargin(baseCostPerUnit, baseRecommendedPrice);

  // If no variants, return standard result
  if (!input.hasVariants || !input.variants || input.variants.length === 0) {
    const profitPerBatch = round(baseProfitPerUnit * input.batchSize);
    return {
      totalCost,
      costPerUnit: baseCostPerUnit,
      breakEvenPrice: baseCostPerUnit,
      recommendedPrice: baseRecommendedPrice,
      profitPerBatch,
      profitPerUnit: baseProfitPerUnit,
      profitMarginPercent: baseProfitMarginPercent,
      breakdown: {
        ingredients: ingredientCost,
        labor: input.laborCost,
        overhead: input.overhead,
        packaging: packagingCost,
        platformFee:
          platformFeePercent > 0
            ? round(baseRecommendedPrice - rawBaseRecommendedPrice)
            : 0,
      },
      variantResults: undefined,
    };
  }

  // 2. Variant Calculations
  const variantResults: VariantResult[] = [];
  let totalVariantBatchSize = 0;
  let totalProfit = 0;

  // Process explicitly defined variants
  input.variants.forEach((variant) => {
    totalVariantBatchSize += variant.batchSize;

    // Allocation of base cost: (Base Unit Cost * Variant Batch Size)
    // Note: This assumes base costs are distributed evenly per unit of batch.
    const allocatedBaseCost = baseCostPerUnit * variant.batchSize;

    // Variant specific costs
    const variantSpecificIngredients = calculateTotalIngredientCost(variant.ingredients);
    const variantTotalCost =
      allocatedBaseCost +
      variantSpecificIngredients +
      (variant.laborCost || 0) +
      (variant.overhead || 0);

    // Variant Unit Cost
    const variantCostPerUnit = calculateCostPerUnit(variantTotalCost, variant.batchSize);

    // Variant Price Recommendation
    const variantRecPrice = calculateRecommendedPrice(
      variantCostPerUnit,
      variant.pricingConfig.strategy,
      variant.pricingConfig.value
    );

    const variantProfitPerUnit = round(variantRecPrice - variantCostPerUnit);
    const variantProfitTotal = round(variantProfitPerUnit * variant.batchSize);
    const variantMargin = calculateProfitMargin(variantCostPerUnit, variantRecPrice);

    let currentProfitPerUnit: number | undefined;
    let currentProfitMargin: number | undefined;

    if (variant.currentSellingPrice !== undefined && variant.currentSellingPrice > 0) {
      currentProfitPerUnit = round(variant.currentSellingPrice - variantCostPerUnit);
      currentProfitMargin = calculateProfitMargin(variantCostPerUnit, variant.currentSellingPrice);
    }

    totalProfit += variantProfitTotal;

    variantResults.push({
      id: variant.id,
      name: variant.name,
      totalCost: round(variantTotalCost),
      costPerUnit: variantCostPerUnit,
      recommendedPrice: variantRecPrice,
      profitPerUnit: variantProfitPerUnit,
      profitMarginPercent: variantMargin,
      breakEvenPrice: variantCostPerUnit,
      currentSellingPrice: variant.currentSellingPrice,
      currentProfitPerUnit,
      currentProfitMargin,
      breakdown: {
        baseAllocation: round(allocatedBaseCost),
        specificIngredients: round(variantSpecificIngredients),
        specificLabor: round(variant.laborCost || 0),
        specificOverhead: round(variant.overhead || 0),
      },
    });
  });

  // 3. Process Leftovers (Implicit "Base" Variant)
  const remainingBatch = input.batchSize - totalVariantBatchSize;

  if (remainingBatch > 0) {
    const leftoverProfitTotal = round(baseProfitPerUnit * remainingBatch);
    totalProfit += leftoverProfitTotal;

    let baseCurrentProfitPerUnit: number | undefined;
    let baseCurrentProfitMargin: number | undefined;

    if (input.currentSellingPrice !== undefined && input.currentSellingPrice > 0) {
      baseCurrentProfitPerUnit = round(input.currentSellingPrice - baseCostPerUnit);
      baseCurrentProfitMargin = calculateProfitMargin(baseCostPerUnit, input.currentSellingPrice);
    }

    // Add Base as the first result
    variantResults.unshift({
      id: 'base-original',
      name: (input.productName || 'Original') + ' (Base)',
      totalCost: round(baseCostPerUnit * remainingBatch),
      costPerUnit: baseCostPerUnit,
      recommendedPrice: baseRecommendedPrice,
      profitPerUnit: baseProfitPerUnit,
      profitMarginPercent: baseProfitMarginPercent,
      breakEvenPrice: baseCostPerUnit,
      currentSellingPrice: input.currentSellingPrice,
      currentProfitPerUnit: baseCurrentProfitPerUnit,
      currentProfitMargin: baseCurrentProfitMargin,
      breakdown: {
        baseAllocation: round(baseCostPerUnit * remainingBatch),
        specificIngredients: 0,
        specificLabor: 0,
        specificOverhead: 0,
      },
    });
  }

  return {
    totalCost, // This is still the total input cost for the whole batch
    costPerUnit: baseCostPerUnit, // Base unit cost reference
    breakEvenPrice: baseCostPerUnit, // Base break even reference
    recommendedPrice: baseRecommendedPrice, // Base recommendation reference
    profitPerBatch: round(totalProfit), // Sum of all variant profits
    profitPerUnit: baseProfitPerUnit, // Base profit ref
    profitMarginPercent: baseProfitMarginPercent, // Base margin ref
    breakdown: {
      ingredients: ingredientCost,
      labor: input.laborCost,
      overhead: input.overhead,
      packaging: packagingCost,
      platformFee:
        platformFeePercent > 0
          ? round(baseRecommendedPrice - rawBaseRecommendedPrice)
          : 0,
    },
    variantResults,
  };
};

// Apply VAT and wholesale pricing on top of an already-computed result.
// Pure function — kept separate so the core calculation stays signature-stable.
export const enrichWithVatAndWholesale = (
  result: import('../types/calculator').CalculationResult,
  input: import('../types/calculator').CalculationInput,
  options: {
    vatEnabled: boolean;
    vatPercent: number;
    vatInclusive: boolean;
  }
): import('../types/calculator').CalculationResult => {
  let recommendedPrice = result.recommendedPrice;
  let vatAmount: number | undefined;
  let priceWithVat: number | undefined;

  if (options.vatEnabled && options.vatPercent > 0) {
    const v = options.vatPercent / 100;
    if (options.vatInclusive) {
      // Displayed price includes VAT; back out the VAT component.
      const grossed = round(recommendedPrice * (1 + v));
      priceWithVat = grossed;
      vatAmount = round(grossed - recommendedPrice);
      recommendedPrice = grossed;
    } else {
      vatAmount = round(recommendedPrice * v);
      priceWithVat = round(recommendedPrice + vatAmount);
    }
  }

  let wholesalePrice: number | undefined;
  if (input.wholesale?.enabled) {
    wholesalePrice = calculateRecommendedPrice(
      result.costPerUnit,
      input.wholesale.strategy,
      input.wholesale.value
    );
  }

  return {
    ...result,
    recommendedPrice,
    vatAmount,
    priceWithVat,
    wholesalePrice,
  };
};

// --- Unit Conversion Logic ---

export type UnitCategory = 'weight' | 'volume' | 'count';

interface UnitDefinition {
  value: string;
  label: string;
  category: UnitCategory;
  toBase: number; // Factor to convert to base unit (g, ml, piece)
}

const UNITS: Record<string, UnitDefinition> = {
  // Weight (Base: g)
  g: { value: 'g', label: 'g', category: 'weight', toBase: 1 },
  kg: { value: 'kg', label: 'kg', category: 'weight', toBase: 1000 },
  oz: { value: 'oz', label: 'oz', category: 'weight', toBase: 28.3495 },
  lb: { value: 'lb', label: 'lb', category: 'weight', toBase: 453.592 },

  // Volume (Base: ml)
  ml: { value: 'ml', label: 'ml', category: 'volume', toBase: 1 },
  l: { value: 'l', label: 'L', category: 'volume', toBase: 1000 },
  tsp: { value: 'tsp', label: 'tsp', category: 'volume', toBase: 4.92892 },
  tbsp: { value: 'tbsp', label: 'tbsp', category: 'volume', toBase: 14.7868 },
  cup: { value: 'cup', label: 'cup', category: 'volume', toBase: 236.588 },
  fl_oz: { value: 'fl_oz', label: 'fl oz', category: 'volume', toBase: 29.5735 },

  // Count (Base: piece)
  piece: { value: 'piece', label: 'pcs', category: 'count', toBase: 1 },
  dozen: { value: 'dozen', label: 'doz', category: 'count', toBase: 12 },
};

export const UNIT_OPTIONS = Object.values(UNITS).map((u) => ({
  label: u.label,
  value: u.value,
}));

/**
 * Calculates the cost of the used ingredient portion based on purchase details.
 * Handles unit conversions within the same category (weight -> weight, volume -> volume).
 * Returns null if calculation is not possible (incompatible units, missing values).
 */
export const calculateIngredientCostFromPurchase = (
  purchaseQuantity: number,
  purchaseUnit: string,
  purchaseCost: number,
  recipeQuantity: number,
  recipeUnit: string
): number | null => {
  if (
    purchaseQuantity <= 0 ||
    purchaseCost < 0 ||
    recipeQuantity < 0 ||
    !UNITS[purchaseUnit] ||
    !UNITS[recipeUnit]
  ) {
    return null;
  }

  const pUnit = UNITS[purchaseUnit];
  const rUnit = UNITS[recipeUnit];

  // If categories don't match, we can't convert automatically (e.g. kg to L)
  // unless we assume density=1, but for safety we return null (or 0)
  // allowing the user to see the error/incompatibility.
  if (pUnit.category !== rUnit.category) {
    return null;
  }

  const purchaseAmountInBase = purchaseQuantity * pUnit.toBase;
  const recipeAmountInBase = recipeQuantity * rUnit.toBase;
  const costPerBaseUnit = purchaseCost / purchaseAmountInBase;

  const finalCost = costPerBaseUnit * recipeAmountInBase;
  return round(finalCost);
};
