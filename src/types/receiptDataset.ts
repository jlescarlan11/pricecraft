import type { ParsedReceiptLine } from './catalog';

export const RECEIPT_CONSENT_VERSION = 'receipt-data-v1';
export interface ReceiptConsent {
  version: typeof RECEIPT_CONSENT_VERSION;
  decidedAt: string;
  localSave: true;
  cloudBackup: boolean;
  modelTraining: boolean;
}

export interface ReceiptReviewRow {
  id: string;
  sourceIndex: number | null;
  label: 'unreviewed' | 'product' | 'not-product';
  includeInCatalog: boolean;
  values: {
    itemName: string;
    quantity: number | null;
    unit: string | null;
    price: number | null;
  };
}

export interface ReceiptReview {
  id: string;
  reviewedAt: string;
  complete: boolean;
  rows: ReceiptReviewRow[];
}

export interface ReceiptCapture {
  id: string;
  createdAt: string;
  original: Blob;
  ocrImage: Blob;
  originalName: string;
  rawText: string;
  predictedLines: ParsedReceiptLine[];
  metadata: {
    ocrProvider: 'ocr-space' | 'tesseract';
    ocrModel: string;
    extractor: string;
    parserVersion: string;
    preprocessingVersion: string;
  };
  // Provider output preserves layout evidence when available. It is never a label.
  ocrEvidence?: unknown;
}

export interface ReceiptExample extends ReceiptCapture {
  schemaVersion: 1;
  ownerId: string;
  revision: number;
  syncedRevision: number;
  updatedAt: string;
  reviews: ReceiptReview[];
  // Missing on legacy records: never interpret missing permission as an opt-in.
  consent?: ReceiptConsent;
  consentHistory?: ReceiptConsent[];
  cloudCopyMayExist?: boolean;
}
