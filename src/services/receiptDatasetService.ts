import { supabase } from '../lib/supabase';
import { RECEIPT_CONSENT_VERSION } from '../types/receiptDataset';
import type {
  ReceiptCapture,
  ReceiptConsent,
  ReceiptExample,
  ReceiptReview,
} from '../types/receiptDataset';

const DATABASE = 'pricecraft-receipt-dataset';
const STORE = 'examples';
const BUCKET = 'receipt-training-images';
const ownerKey = (userId?: string) => userId || 'guest';

function hasConsent(consent?: ReceiptConsent): consent is ReceiptConsent {
  return (
    !!consent &&
    consent.version === RECEIPT_CONSENT_VERSION &&
    consent.localSave === true &&
    typeof consent.cloudBackup === 'boolean' &&
    typeof consent.modelTraining === 'boolean' &&
    Number.isFinite(Date.parse(consent.decidedAt))
  );
}
function needsCloudWork(record: ReceiptExample) {
  if (!hasConsent(record.consent)) return false;
  return record.consent.cloudBackup
    ? record.revision !== record.syncedRevision
    : !!record.cloudCopyMayExist || record.syncedRevision > 0;
}
export function isReceiptTrainingEligible(record: ReceiptExample) {
  return (
    hasConsent(record.consent) &&
    record.consent.modelTraining &&
    record.reviews.at(-1)?.complete === true
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('ownerId', 'ownerId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Close other PriceCraft tabs and try saving again.'));
  });
}

async function request<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const result = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => {
      db.close();
      resolve(result.result);
    };
    transaction.onabort = transaction.onerror = () => {
      db.close();
      reject(
        transaction.error || result.error || new Error('Receipt could not be saved on this device.')
      );
    };
  });
}

async function update(
  id: string,
  userId: string | undefined,
  transform: (record: ReceiptExample) => ReceiptExample
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const read = store.get(id);
    let failure: unknown;
    read.onsuccess = () => {
      try {
        const record = read.result as ReceiptExample | undefined;
        if (!record || record.ownerId !== ownerKey(userId))
          throw new Error('Saved receipt not found for this account.');
        store.put(transform(record));
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onabort = transaction.onerror = () => {
      db.close();
      reject(
        failure || transaction.error || new Error('Receipt could not be saved on this device.')
      );
    };
  });
}

function validateReview(record: ReceiptExample, review: ReceiptReview) {
  if (!hasConsent(record.consent))
    throw new Error('Confirm receipt saving permission before saving corrections.');
  const sourceIndices = review.rows.flatMap((row) =>
    row.sourceIndex === null ? [] : [row.sourceIndex]
  );
  if (
    new Set(sourceIndices).size !== record.predictedLines.length ||
    sourceIndices.length !== record.predictedLines.length ||
    sourceIndices.some((i) => !Number.isInteger(i) || i < 0 || i >= record.predictedLines.length)
  ) {
    throw new Error('The review must retain every predicted row, including rejected rows.');
  }
  if (new Set(review.rows.map((row) => row.id)).size !== review.rows.length)
    throw new Error('Duplicate review rows.');
  if (
    record.reviews
      .at(-1)
      ?.rows.some(
        (previous) =>
          previous.sourceIndex === null &&
          !review.rows.some((row) => row.id === previous.id && row.sourceIndex === null)
      )
  )
    throw new Error('Retain earlier added rows and mark removed items as not a product.');
  for (const row of review.rows) {
    if (!['unreviewed', 'product', 'not-product'].includes(row.label))
      throw new Error('Invalid review label.');
    if (review.complete && row.label === 'unreviewed')
      throw new Error('Review each row before marking the receipt complete.');
    if (row.includeInCatalog && row.label !== 'product')
      throw new Error('Only verified products can be added to the catalog.');
    if (row.label !== 'product') continue;
    const { itemName, price, quantity, unit } = row.values;
    if (!itemName.trim() || price === null || !Number.isFinite(price) || price < 0)
      throw new Error('Verified products need a name and valid price.');
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0))
      throw new Error('Quantity must be positive or unknown.');
    if (row.includeInCatalog && (quantity === null || !unit))
      throw new Error('Catalog products need a quantity and unit.');
  }
}

async function imageDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

const syncs = new Map<string, Promise<{ pending: number }>>();

export const receiptDatasetService = {
  async saveScan(
    capture: ReceiptCapture,
    userId?: string,
    consent?: ReceiptConsent
  ): Promise<void> {
    if (!hasConsent(consent)) throw new Error('Receipt saving permission is required.');
    const record: ReceiptExample = {
      ...capture,
      schemaVersion: 1,
      ownerId: ownerKey(userId),
      revision: 1,
      syncedRevision: 0,
      updatedAt: capture.createdAt,
      reviews: [],
      consent,
      consentHistory: [consent],
      cloudCopyMayExist: false,
    };
    // add, not put: a retry must never replace predictions or erase reviews.
    const existing = await request<ReceiptExample | undefined>('readonly', (store) =>
      store.get(capture.id)
    );
    if (existing) {
      if (existing.ownerId !== record.ownerId)
        throw new Error('Receipt belongs to another account.');
      await update(capture.id, userId, (current) => {
        const previous = current.consent;
        if (
          hasConsent(previous) &&
          previous.cloudBackup === consent.cloudBackup &&
          previous.modelTraining === consent.modelTraining
        )
          return current;
        return {
          ...current,
          consent,
          consentHistory: [...(current.consentHistory || []), consent],
          revision: current.revision + 1,
          updatedAt: consent.decidedAt,
        };
      });
      return;
    }
    await request('readwrite', (store) => store.add(record));
  },

  async saveReview(id: string, userId: string | undefined, review: ReceiptReview): Promise<void> {
    await update(id, userId, (record) => {
      if (record.reviews.some((saved) => saved.id === review.id)) return record;
      validateReview(record, review);
      return {
        ...record,
        reviews: [...record.reviews, review],
        revision: record.revision + 1,
        updatedAt: review.reviewedAt,
      };
    });
  },

  async list(userId?: string): Promise<ReceiptExample[]> {
    return request('readonly', (store) => store.index('ownerId').getAll(ownerKey(userId)));
  },

  async exportReviewed(
    userId?: string,
    purpose: 'personal' | 'training' = 'personal'
  ): Promise<string> {
    const records = (await this.list(userId)).filter(
      (record) =>
        record.reviews.at(-1)?.complete &&
        (purpose === 'personal' || isReceiptTrainingEligible(record))
    );
    const examples = await Promise.all(
      records.map(async (record) => {
        const { original, ocrImage } = record;
        return {
          id: record.id,
          schemaVersion: record.schemaVersion,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          originalName: record.originalName,
          rawText: record.rawText,
          predictedLines: record.predictedLines,
          metadata: record.metadata,
          ocrEvidence: record.ocrEvidence,
          reviews: record.reviews,
          revision: record.revision,
          consent: record.consent ?? null,
          consentHistory: record.consentHistory || [],
          original: { mimeType: original.type, dataUrl: await imageDataUrl(original) },
          ocrImage: { mimeType: ocrImage.type, dataUrl: await imageDataUrl(ocrImage) },
        };
      })
    );
    return JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        purpose: purpose === 'training' ? 'model-training' : 'personal-backup',
        labelScope: 'structured-items-not-verbatim-transcription',
        examples,
      },
      null,
      2
    );
  },

  async sync(userId?: string): Promise<{ pending: number }> {
    if (!userId || !navigator.onLine)
      return {
        pending: (await this.list(userId)).filter(needsCloudWork).length,
      };
    const running = syncs.get(userId);
    if (running) return running;
    const operation = this.syncOwned(userId);
    syncs.set(userId, operation);
    try {
      return await operation;
    } finally {
      syncs.delete(userId);
    }
  },

  async syncOwned(userId: string): Promise<{ pending: number }> {
    // The module-level map only coalesces this tab. Serialize network writes and
    // revocation cleanup across tabs before either can clear the cleanup marker.
    // Without browser coordination, keep the local record and surface pending work.
    if (!navigator.locks?.request)
      return { pending: (await this.list(userId)).filter(needsCloudWork).length };
    return navigator.locks.request(`pricecraft-receipt-sync:${userId}`, async () => {
      const pending = (await this.list(userId)).filter(needsCloudWork);
      const { data, error } = await supabase.auth.getSession();
      if (error || data.session?.user.id !== userId) return { pending: pending.length };
      // Drain revisions changed during a request, without automatically retrying
      // failed network operations forever. A remaining failure stays visibly pending.
      for (let pass = 0; pass < 2; pass++) {
        const work = (await this.list(userId)).filter(needsCloudWork);
        const revisions = new Map(work.map((record) => [record.id, record.revision]));
        const failed = new Set<string>();
        for (const queued of work) {
          // Consent may have changed while earlier receipts were syncing.
          const record = (await this.list(userId)).find((entry) => entry.id === queued.id);
          if (!record || !needsCloudWork(record)) continue;
          try {
            const originalPath = `${userId}/${record.id}/original`;
            const ocrPath = `${userId}/${record.id}/ocr-input`;
            if (!record.consent?.cloudBackup) {
              // Remove permission-bearing metadata before image cleanup, so failed
              // image removal cannot leave a stale training-eligible cloud row.
              const { error: deleteError } = await supabase
                .from('receipt_training_examples')
                .delete()
                .eq('id', record.id)
                .eq('user_id', userId);
              if (deleteError) throw deleteError;
              const { error: removeError } = await supabase.storage
                .from(BUCKET)
                .remove([originalPath, ocrPath]);
              if (removeError) throw removeError;
              await update(record.id, userId, (current) => ({
                ...current,
                syncedRevision: 0,
                cloudCopyMayExist: false,
              }));
              continue;
            }
            // Persist this before any upload. Interrupted/partially successful
            // uploads must remain removable even without a successful metadata row.
            await update(record.id, userId, (current) =>
              current.revision === record.revision && current.consent?.cloudBackup
                ? { ...current, cloudCopyMayExist: true }
                : current
            );
            for (const [path, blob] of [
              [originalPath, record.original],
              [ocrPath, record.ocrImage],
            ] as const) {
              const beforeUpload = (await this.list(userId)).find(
                (entry) => entry.id === record.id
              );
              if (!beforeUpload?.consent?.cloudBackup || beforeUpload.revision !== record.revision)
                break;
              const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(path, blob, {
                  contentType: blob.type || 'application/octet-stream',
                  upsert: true,
                });
              if (uploadError) throw uploadError;
              const current = (await this.list(userId)).find((entry) => entry.id === record.id);
              if (!current || current.revision !== record.revision) break;
            }
            const latest = (await this.list(userId)).find((current) => current.id === record.id);
            if (!latest || latest.revision !== record.revision) continue;
            const { error: saveError } = await supabase.from('receipt_training_examples').upsert({
              id: record.id,
              user_id: userId,
              schema_version: record.schemaVersion,
              original_path: originalPath,
              ocr_path: ocrPath,
              original_name: record.originalName,
              original_mime: record.original.type,
              ocr_mime: record.ocrImage.type,
              raw_ocr_text: record.rawText,
              predicted_lines: record.predictedLines,
              scan_metadata: {
                ...record.metadata,
                collectionConsent: record.consent,
                consentHistory: record.consentHistory || [],
              },
              ocr_evidence: record.ocrEvidence ?? null,
              reviews: record.reviews,
              revision: record.revision,
              created_at: record.createdAt,
              updated_at: record.updatedAt,
            });
            if (saveError) throw saveError;
            await update(record.id, userId, (current) => ({
              ...current,
              syncedRevision: record.revision,
              cloudCopyMayExist: true,
            }));
          } catch {
            failed.add(record.id);
            // Keep the durable local record pending. Never claim a cloud save on error.
          }
        }
        const remaining = (await this.list(userId)).filter(needsCloudWork);
        if (
          !remaining.some(
            (record) => !failed.has(record.id) && revisions.get(record.id) !== record.revision
          )
        )
          break;
      }
      return {
        pending: (await this.list(userId)).filter(needsCloudWork).length,
      };
    });
  },
};
