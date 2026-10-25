import { useCallback, useEffect, useState } from 'react';
import {
  isReceiptTrainingEligible,
  receiptDatasetService,
} from '../../services/receiptDatasetService';
import type { ReceiptExample } from '../../types/receiptDataset';
import { Button } from '../shared';

export function ReceiptDatasetPanel({
  userId,
  refreshToken,
  onReview,
}: {
  userId?: string;
  refreshToken: number;
  onReview: (example: ReceiptExample) => void;
}) {
  const [records, setRecords] = useState<ReceiptExample[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setRecords(await receiptDatasetService.list(userId));
    } catch {
      setMessage('Saved receipts are unavailable. Check that browser storage is enabled.');
    }
  }, [userId]);
  const sync = useCallback(async () => {
    try {
      const { pending } = await receiptDatasetService.sync(userId);
      setMessage(
        userId && pending
          ? 'Saved on this device. Cloud backup or removal is pending; retry when connected.'
          : ''
      );
      await refresh();
    } catch {
      setMessage('Could not sync saved receipts. Your local copies remain on this device.');
    }
  }, [userId, refresh]);
  useEffect(() => {
    void refresh().then(sync);
    const online = () => {
      void sync();
    };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [refresh, sync, refreshToken]);
  const completeCount = records.filter((record) => record.reviews.at(-1)?.complete).length;
  const trainingCount = records.filter(isReceiptTrainingEligible).length;
  const exportData = async (purpose: 'personal' | 'training') => {
    setBusy(true);
    try {
      const json = await receiptDatasetService.exportReviewed(userId, purpose);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pricecraft-${purpose === 'training' ? 'training-' : ''}receipts-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setMessage('Could not export receipts. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card p-5 space-y-sm" aria-label="Saved receipts">
      <h2 className="text-lg font-medium">Saved receipts</h2>
      <p className="text-sm text-ink-500">
        {records.length} saved on this device · {completeCount} fully reviewed. Exports include
        photos, original predictions, and submitted correction history. {trainingCount} receipts
        have current permission for training and are fully reviewed. Permission can be changed by
        reviewing a saved receipt.
      </p>
      {!userId && (
        <p className="text-xs text-ink-500">
          Guest receipts stay on this device and are not uploaded when you sign in.
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-rust">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-sm">
        <Button
          variant="secondary"
          disabled={!completeCount || busy}
          isLoading={busy}
          onClick={() => {
            void exportData('personal');
          }}
        >
          Export reviewed receipts
        </Button>
        <Button
          variant="secondary"
          disabled={!trainingCount || busy}
          onClick={() => {
            void exportData('training');
          }}
        >
          Export training dataset
        </Button>
        {userId && (
          <Button
            variant="ghost"
            onClick={() => {
              void sync();
            }}
          >
            Retry cloud backup
          </Button>
        )}
      </div>
      {!!records.length && (
        <details>
          <summary className="cursor-pointer text-sm py-sm">Review saved receipts</summary>
          <ul className="divide-y divide-border-base">
            {[...records].reverse().map((record) => (
              <li
                key={record.id}
                className="py-sm flex flex-wrap justify-between gap-sm items-center"
              >
                <span className="text-sm break-all">
                  {record.originalName} ·{' '}
                  {record.reviews.at(-1)?.complete ? 'Reviewed' : 'Needs review'} ·{' '}
                  {!record.consent
                    ? 'Confirm permission before backup or training'
                    : record.consent.cloudBackup && record.syncedRevision === record.revision
                      ? 'Backed up'
                      : !record.consent.cloudBackup &&
                          (record.cloudCopyMayExist || record.syncedRevision > 0)
                        ? 'Cloud removal pending'
                        : 'On this device'}
                </span>
                <Button size="sm" variant="ghost" onClick={() => onReview(record)}>
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
