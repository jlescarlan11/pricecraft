export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  cost: number;
  measurementMode?: 'simple' | 'advanced';
  purchaseQuantity?: number;
  purchaseUnit?: string;
  purchaseCost?: number;
  recipeQuantity?: number;
  recipeUnit?: string;
  useFullQuantity?: boolean;
  catalogIngredientId?: string;
}

export interface Variant {
  id: string;
  name: string;
  batchSize: number;
  ingredients: Ingredient[];
  laborCost: number;
  overhead: number;
  pricingConfig: PricingConfig;
  currentSellingPrice?: number;
}

export interface CalculationInput {
  businessName?: string;
  productName: string;
  batchSize: number;
  ingredients: Ingredient[];
  laborCost: number;
  overhead: number;
  currentSellingPrice?: number;
  hasVariants?: boolean;
  variants?: Variant[];
}

export type PricingStrategy = 'markup' | 'margin';

export interface PricingConfig {
  strategy: PricingStrategy;
  value: number;
}

export interface VariantResult {
  id: string;
  name: string;
  totalCost: number;
  costPerUnit: number;
  recommendedPrice: number;
  profitPerUnit: number;
  profitMarginPercent: number;
  breakEvenPrice: number;
  currentSellingPrice?: number;
  currentProfitPerUnit?: number;
  currentProfitMargin?: number;
  breakdown?: {
    baseAllocation: number;
    specificIngredients: number;
    specificLabor: number;
    specificOverhead: number;
  };
}

export interface CalculationResult {
  totalCost: number;
  costPerUnit: number;
  breakEvenPrice: number;
  recommendedPrice: number;
  profitPerBatch: number;
  profitPerUnit: number;
  profitMarginPercent: number;
  breakdown: {
    ingredients: number;
    labor: number;
    overhead: number;
  };
  variantResults?: VariantResult[];
}

export interface Preset {
  id: string;
  userId?: string;
  name: string;
  presetType: 'default' | 'variant';
  baseRecipe: CalculationInput;
  variants: Variant[];
  pricingConfig: PricingConfig;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
}
