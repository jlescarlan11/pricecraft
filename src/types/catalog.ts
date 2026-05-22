export interface CatalogIngredient {
  id: string;
  userId?: string;
  name: string;
  normalizedName: string;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchaseCost: number;
  currentPricePerBaseUnit: number;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
}

export interface PriceHistoryEntry {
  id: string;
  catalogIngredientId: string;
  userId?: string;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchaseCost: number;
  source: 'manual' | 'receipt';
  receiptId?: string | null;
  recordedAt: string;
}

export interface ReceiptScan {
  id: string;
  userId?: string;
  storeName?: string | null;
  scannedAt: string;
  rawOcrText: string;
  lineCount: number;
  acceptedCount: number;
}

export interface ParsedReceiptLine {
  rawText: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  price: number;
  confidence: number;
  catalogIngredientId?: string;
}

export interface DriftEntry {
  catalogIngredientId: string;
  ingredientName: string;
  oldPricePerBaseUnit: number;
  newPricePerBaseUnit: number;
  percentChange: number;
  affectedPresets: {
    presetId: string;
    presetName: string;
    oldTotalCost: number;
    newTotalCost: number;
  }[];
}
