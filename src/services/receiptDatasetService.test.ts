import { IDBFactory } from 'fake-indexeddb';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptCapture, ReceiptReview } from '../types/receiptDataset';
import { receiptDatasetService } from './receiptDatasetService';

const cloud = vi.hoisted(() => ({
  userId: 'owner-a',
  upload: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: cloud.userId } } }, error: null }),
    },
    storage: { from: () => ({ upload: cloud.upload }) },
    from: () => ({ upsert: cloud.upsert }),
  },
}));

const capture = (id = 'receipt-1'): ReceiptCapture => ({
  id,
  createdAt: '2026-10-25T00:00:00Z',
  originalName: 'receipt.png',
  original: new NodeBlob(['original pixels'], { type: 'image/png' }) as Blob,
  ocrImage: new NodeBlob(['processed pixels'], { type: 'image/jpeg' }) as Blob,
  rawText: 'PORK 134.30',
  predictedLines: [{ rawText: 'PORK 134.30', itemName: 'PORK', price: 134.3, confidence: 0.75 }],
  metadata: {
    ocrProvider: 'ocr-space',
    ocrModel: 'engine-2',
    extractor: 'heuristic',
    parserVersion: '2',
    preprocessingVersion: '1',
  },
});
const review = (id = 'review-1'): ReceiptReview => ({
  id,
  reviewedAt: '2026-10-25T00:01:00Z',
  complete: true,
  rows: [
    {
      id: 'row-0',
      sourceIndex: 0,
      label: 'product',
      includeInCatalog: false,
      values: { itemName: 'Pork belly', quantity: 0.34, unit: 'kg', price: 134.3 },
    },
  ],
});

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  cloud.userId = 'owner-a';
  cloud.upload.mockReset().mockResolvedValue({ error: null });
  cloud.upsert.mockReset().mockResolvedValue({ error: null });
});

describe('receipt dataset persistence', () => {
  it('retains original pixels and immutable predictions alongside append-only corrections', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a');
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', review());
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', review()); // retry is idempotent
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', {
      ...review('review-2'),
      rows: [{ ...review().rows[0], values: { ...review().rows[0].values, quantity: 0.35 } }],
    });
    const [stored] = await receiptDatasetService.list('owner-a');
    expect(await stored.original.text()).toBe('original pixels');
    expect(await stored.ocrImage.text()).toBe('processed pixels');
    expect(stored.predictedLines[0].itemName).toBe('PORK');
    expect(stored.reviews).toHaveLength(2);
    expect(stored.reviews[0].rows[0].values.quantity).toBe(0.34);
    expect(stored.reviews[1].rows[0].values.quantity).toBe(0.35);
  });

  it('isolates guest and other-account records and disallows cross-account edits', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a');
    await receiptDatasetService.saveScan(capture('guest-receipt'));
    expect(await receiptDatasetService.list('owner-b')).toEqual([]);
    expect((await receiptDatasetService.list()).map((x) => x.id)).toEqual(['guest-receipt']);
    await expect(
      receiptDatasetService.saveReview('receipt-1', 'owner-b', review())
    ).rejects.toThrow(/not found/i);
  });

  it('exports only complete verified examples, including original images and explicit negative labels', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a');
    await receiptDatasetService.saveScan(capture('unreviewed'), 'owner-a');
    await receiptDatasetService.saveReview('unreviewed', 'owner-a', {
      ...review(),
      complete: false,
    });
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', {
      ...review(),
      rows: [{ ...review().rows[0], label: 'not-product', includeInCatalog: false }],
    });
    const dataset = JSON.parse(await receiptDatasetService.exportReviewed('owner-a'));
    expect(dataset.examples).toHaveLength(1);
    expect(dataset.examples[0].original.dataUrl).toBe('data:image/png;base64,b3JpZ2luYWwgcGl4ZWxz');
    expect(dataset.examples[0].reviews[0].rows[0].label).toBe('not-product');
    expect(dataset.examples[0].predictedLines[0].itemName).toBe('PORK');
  });

  it('rejects incomplete labels claimed as complete or missing source rows', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a');
    await expect(
      receiptDatasetService.saveReview('receipt-1', 'owner-a', { ...review(), rows: [] })
    ).rejects.toThrow();
    await expect(
      receiptDatasetService.saveReview('receipt-1', 'owner-a', {
        ...review(),
        rows: [{ ...review().rows[0], label: 'unreviewed' }],
      })
    ).rejects.toThrow();
  });

  it('keeps failed uploads pending and retries images before declaring a cloud record synced', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    cloud.upload.mockResolvedValueOnce({ error: new Error('offline') });
    expect(await receiptDatasetService.sync('owner-a')).toMatchObject({ pending: 1 });
    expect(cloud.upsert).not.toHaveBeenCalled();
    expect(await receiptDatasetService.sync('owner-a')).toMatchObject({ pending: 0 });
    expect(cloud.upload).toHaveBeenCalledWith(
      'owner-a/receipt-1/original',
      expect.anything(),
      expect.objectContaining({ contentType: 'image/png', upsert: true })
    );
    expect(cloud.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'owner-a',
        original_path: 'owner-a/receipt-1/original',
        raw_ocr_text: 'PORK 134.30',
      })
    );
  });

  it('never syncs another account or guest data into the current session', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    cloud.userId = 'owner-b';
    await receiptDatasetService.sync('owner-a');
    await receiptDatasetService.sync();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.upsert).not.toHaveBeenCalled();
  });
});
