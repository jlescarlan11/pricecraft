import { IDBFactory } from 'fake-indexeddb';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptCapture, ReceiptReview } from '../types/receiptDataset';
import { receiptDatasetService } from './receiptDatasetService';

const cloud = vi.hoisted(() => ({
  userId: 'owner-a',
  upload: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  deleteRow: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: cloud.userId } } }, error: null }),
    },
    storage: { from: () => ({ upload: cloud.upload, remove: cloud.remove }) },
    from: () => ({ upsert: cloud.upsert, delete: () => ({ eq: () => ({ eq: cloud.deleteRow }) }) }),
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
const consent = (backup = true, training = true) => ({
  version: 'receipt-data-v1' as const,
  decidedAt: '2026-10-25T00:00:00Z',
  localSave: true as const,
  cloudBackup: backup,
  modelTraining: training,
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
  // Shared browser lock manager, also shared by separately loaded tab modules.
  let lockTail = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: vi.fn(async (_name: string, run: () => Promise<unknown>) => {
        const previous = lockTail;
        let release!: () => void;
        lockTail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await run();
        } finally {
          release();
        }
      }),
    },
  });
  cloud.userId = 'owner-a';
  cloud.upload.mockReset().mockResolvedValue({ error: null });
  cloud.upsert.mockReset().mockResolvedValue({ error: null });
  cloud.remove.mockReset().mockResolvedValue({ error: null });
  cloud.deleteRow.mockReset().mockResolvedValue({ error: null });
});

describe('receipt dataset persistence', () => {
  it('retains original pixels and immutable predictions alongside append-only corrections', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
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
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
    await receiptDatasetService.saveScan(capture('guest-receipt'), undefined, consent(false));
    expect(await receiptDatasetService.list('owner-b')).toEqual([]);
    expect((await receiptDatasetService.list()).map((x) => x.id)).toEqual(['guest-receipt']);
    await expect(
      receiptDatasetService.saveReview('receipt-1', 'owner-b', review())
    ).rejects.toThrow(/not found/i);
  });

  it('exports only complete verified examples, including original images and explicit negative labels', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
    await receiptDatasetService.saveScan(capture('unreviewed'), 'owner-a', consent());
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
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
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
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
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
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    cloud.userId = 'owner-b';
    await receiptDatasetService.sync('owner-a');
    await receiptDatasetService.sync();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.upsert).not.toHaveBeenCalled();
  });
});

describe('receipt permission enforcement', () => {
  it('requires an explicit local saving acknowledgement at the service boundary', async () => {
    await expect(receiptDatasetService.saveScan(capture(), 'owner-a')).rejects.toThrow(
      /permission|consent/i
    );
    expect(await receiptDatasetService.list('owner-a')).toEqual([]);
  });

  it('keeps local-only data private and excludes it from training while permitting an owner export', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent(false, false));
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', review());
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 0 });
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.upsert).not.toHaveBeenCalled();
    expect(
      JSON.parse(await receiptDatasetService.exportReviewed('owner-a', 'training')).examples
    ).toEqual([]);
    expect(JSON.parse(await receiptDatasetService.exportReviewed('owner-a')).examples).toHaveLength(
      1
    );
  });

  it('records changing consent without replacing original pixels, predictions or review history', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', review());
    await receiptDatasetService.saveScan(
      { ...capture(), original: new NodeBlob(['wrong pixels']) as Blob },
      'owner-a',
      {
        ...consent(true, false),
        decidedAt: '2026-10-25T01:00:00Z',
      }
    );
    const [record] = await receiptDatasetService.list('owner-a');
    expect(record.consent?.modelTraining).toBe(false);
    expect(record.consentHistory?.map((c) => c.modelTraining)).toEqual([true, false]);
    expect(await record.original.text()).toBe('original pixels');
    expect(record.reviews).toHaveLength(1);
    expect(
      JSON.parse(await receiptDatasetService.exportReviewed('owner-a', 'training')).examples
    ).toEqual([]);
  });

  it('carries permission evidence with a fully reviewed training export and cloud backup', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
    await receiptDatasetService.saveReview('receipt-1', 'owner-a', review());
    const data = JSON.parse(await receiptDatasetService.exportReviewed('owner-a', 'training'));
    expect(data.purpose).toBe('model-training');
    expect(data.examples[0].consent).toEqual(consent());
    expect(data.examples[0].consentHistory).toEqual([consent()]);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await receiptDatasetService.sync('owner-a');
    expect(cloud.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        scan_metadata: expect.objectContaining({
          collectionConsent: consent(),
          consentHistory: [consent()],
        }),
      })
    );
  });

  it('removes a revoked backup and keeps failed cloud image removal pending for retry', async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await receiptDatasetService.sync('owner-a');
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent(false, false));
    cloud.remove.mockResolvedValueOnce({ error: new Error('network interruption') });
    expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 1 });
    expect(cloud.deleteRow).toHaveBeenCalledWith('user_id', 'owner-a');
    expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 0 });
    expect(cloud.remove).toHaveBeenCalledWith([
      'owner-a/receipt-1/original',
      'owner-a/receipt-1/ocr-input',
    ]);
    const [record] = await receiptDatasetService.list('owner-a');
    expect(record.cloudCopyMayExist).toBe(false);
    expect(await record.original.text()).toBe('original pixels');
  });
});

it('stops further uploads when backup permission is revoked during an in-flight request', async () => {
  await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  cloud.upload.mockImplementationOnce(async () => {
    await receiptDatasetService.saveScan(capture(), 'owner-a', consent(false, false));
    return { error: null };
  });
  expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 0 });
  expect(cloud.upload).toHaveBeenCalledTimes(1);
  expect(cloud.upsert).not.toHaveBeenCalled();
  expect(cloud.remove).toHaveBeenCalled();
  expect((await receiptDatasetService.list('owner-a'))[0].cloudCopyMayExist).toBe(false);
});

it('does not treat old saved records without permission as permission to train or upload', async () => {
  await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
  await receiptDatasetService.saveReview('receipt-1', 'owner-a', review());
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('pricecraft-receipt-dataset', 1);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('examples', 'readwrite');
      const store = tx.objectStore('examples');
      const read = store.get('receipt-1');
      read.onsuccess = () => {
        const row = read.result;
        delete row.consent;
        delete row.consentHistory;
        store.put(row);
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    open.onerror = () => reject(open.error);
  });
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 0 });
  expect(cloud.upload).not.toHaveBeenCalled();
  expect(
    JSON.parse(await receiptDatasetService.exportReviewed('owner-a', 'training')).examples
  ).toEqual([]);
  expect(JSON.parse(await receiptDatasetService.exportReviewed('owner-a')).examples).toHaveLength(
    1
  );
});

it('retains rejected predictions, missing products, unknown units and all corrected values across review revisions', async () => {
  await receiptDatasetService.saveScan(capture(), 'owner-a', consent(false, true));
  const manual = {
    id: 'manual-1',
    sourceIndex: null,
    label: 'product' as const,
    includeInCatalog: false,
    values: { itemName: 'Missed rice as printed', quantity: null, unit: null, price: 0 },
  };
  await receiptDatasetService.saveReview('receipt-1', 'owner-a', {
    ...review(),
    rows: [{ ...review().rows[0], label: 'not-product', includeInCatalog: false }, manual],
  });
  await expect(
    receiptDatasetService.saveReview('receipt-1', 'owner-a', {
      ...review('bad-drop'),
      rows: [review().rows[0]],
    })
  ).rejects.toThrow(/retain/i);
  await receiptDatasetService.saveReview('receipt-1', 'owner-a', {
    ...review('revision-2'),
    rows: [
      {
        ...review().rows[0],
        values: { itemName: 'Corrected pork', quantity: 0.5, unit: 'kg', price: 200 },
      },
      { ...manual, label: 'not-product' },
    ],
  });
  const data = JSON.parse(await receiptDatasetService.exportReviewed('owner-a', 'training'));
  expect(data.examples[0].reviews).toHaveLength(2);
  expect(data.examples[0].reviews[0].rows[1].values).toEqual(manual.values);
  expect(data.examples[0].reviews[1].rows[0].values).toEqual({
    itemName: 'Corrected pork',
    quantity: 0.5,
    unit: 'kg',
    price: 200,
  });
  expect(data.examples[0].reviews[1].rows[1].label).toBe('not-product');
  expect(data.examples[0].original.dataUrl).toBe('data:image/png;base64,b3JpZ2luYWwgcGl4ZWxz');
});

it('rechecks permission before starting each queued receipt', async () => {
  await receiptDatasetService.saveScan(capture('a'), 'owner-a', consent());
  await receiptDatasetService.saveScan(capture('b'), 'owner-a', consent());
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  cloud.upload.mockImplementationOnce(async () => {
    await receiptDatasetService.saveScan(capture('b'), 'owner-a', consent(false, false));
    return { error: null };
  });
  expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 0 });
  expect(cloud.upload.mock.calls.map(([path]) => path)).toEqual([
    'owner-a/a/original',
    'owner-a/a/ocr-input',
  ]);
});

it('serializes separate tabs so revocation cannot finish before an outstanding upload', async () => {
  vi.resetModules();
  const otherTab = (await import('./receiptDatasetService')).receiptDatasetService;
  await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  let finishUpload!: () => void;
  const gate = new Promise<void>((resolve) => {
    finishUpload = resolve;
  });
  const remote = new Set<string>();
  cloud.upload.mockImplementationOnce(async (path: string) => {
    await gate;
    remote.add(path);
    return { error: null };
  });
  cloud.remove.mockImplementation(async (paths: string[]) => {
    paths.forEach((path) => remote.delete(path));
    return { error: null };
  });
  const uploading = receiptDatasetService.sync('owner-a');
  await vi.waitFor(() => expect(cloud.upload).toHaveBeenCalledTimes(1));
  await otherTab.saveScan(capture(), 'owner-a', consent(false, false));
  const removing = otherTab.sync('owner-a');
  // A second module has its own in-memory sync map; the browser lock must queue it.
  await vi.waitFor(() => expect(navigator.locks.request).toHaveBeenCalledTimes(2));
  expect(cloud.remove).not.toHaveBeenCalled();
  finishUpload();
  await Promise.all([uploading, removing]);
  expect(remote.size).toBe(0);
  expect((await otherTab.list('owner-a'))[0].cloudCopyMayExist).toBe(false);
  expect(await otherTab.sync('owner-a')).toEqual({ pending: 0 });
});

it('keeps cloud work pending without a browser coordination API', async () => {
  await receiptDatasetService.saveScan(capture(), 'owner-a', consent());
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
  expect(await receiptDatasetService.sync('owner-a')).toEqual({ pending: 1 });
  expect(cloud.upload).not.toHaveBeenCalled();
});
