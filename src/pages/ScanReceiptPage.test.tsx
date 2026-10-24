import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IDBFactory } from 'fake-indexeddb';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanReceiptPage } from './ScanReceiptPage';
import { receiptDatasetService } from '../services/receiptDatasetService';
import { catalogService } from '../services/catalogService';

const state = vi.hoisted(() => ({ capture: null as unknown, reset: vi.fn(), reload: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-a' } }) }));
vi.mock('../hooks/use-catalog', () => ({
  useCatalog: () => ({ items: [], reload: state.reload }),
}));
vi.mock('../hooks/use-receipt-scan', () => ({
  useReceiptScan: () => ({
    status: 'done',
    result: {
      rawText: 'Rice 177.00',
      lines: [{ itemName: 'Rice', price: 177, rawText: 'Rice 177.00', confidence: 0.75 }],
    },
    rawText: 'Rice 177.00',
    progress: 1,
    capture: state.capture,
    reset: state.reset,
    scan: vi.fn(),
  }),
}));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  URL.createObjectURL = vi.fn(() => 'blob:receipt');
  URL.revokeObjectURL = vi.fn();
  state.capture = {
    id: 'receipt-page',
    createdAt: '2026-10-25T00:00:00Z',
    originalName: 'receipt.jpg',
    original: new NodeBlob(['original pixels'], { type: 'image/jpeg' }),
    ocrImage: new NodeBlob(['ocr pixels'], { type: 'image/jpeg' }),
    rawText: 'Rice 177.00',
    predictedLines: [{ itemName: 'Rice', price: 177, rawText: 'Rice 177.00', confidence: 0.75 }],
    metadata: {
      ocrProvider: 'ocr-space',
      ocrModel: 'engine-2',
      extractor: 'heuristic',
      parserVersion: '2',
      preprocessingVersion: '1',
    },
  };
});

describe('saving a receipt review', () => {
  it('persists the photo, initial prediction, and corrected purchase values while adding a receipt-linked catalog item', async () => {
    render(
      <MemoryRouter>
        <ScanReceiptPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('Review label'), { target: { value: 'product' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'kg' } });
    fireEvent.click(screen.getByLabelText(/checked the whole receipt/i));
    fireEvent.click(screen.getByRole('button', { name: /save review and add 1/i }));
    await waitFor(async () => {
      const [record] = await receiptDatasetService.list('owner-a');
      expect(record?.reviews[0]).toMatchObject({
        complete: true,
        rows: [{ values: { quantity: 2, unit: 'kg' } }],
      });
      const items = await catalogService.fetchCatalog('owner-a');
      expect(items).toHaveLength(1);
      expect(items[0].purchaseQuantity).toBe(2);
      const history = await catalogService.fetchPriceHistory(items[0].id, 'owner-a');
      expect(history[0]).toMatchObject({ source: 'receipt', receiptId: 'receipt-page' });
    });
    const [record] = await receiptDatasetService.list('owner-a');
    expect(await record.original.text()).toBe('original pixels');
    expect(record.predictedLines[0].quantity).toBeUndefined();
    await screen.findByText(/1 saved on this device/);
  });
});
