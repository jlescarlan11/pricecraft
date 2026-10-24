import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sun, Crop, FileImage, Wand2, BookOpen } from 'lucide-react';
import { useReceiptScan } from '../hooks/use-receipt-scan';
import { useCatalog } from '../hooks/use-catalog';
import { useAuth } from '../context/AuthContext';
import { ReceiptScanner, ReceiptConfirmation } from '../components/receipt';
import type { AcceptedRow } from '../components/receipt';
import { catalogService } from '../services/catalogService';
import { useToast } from '../components/shared/Toast';
import { Button, PageHeader } from '../components/shared';
import { receiptDatasetService } from '../services/receiptDatasetService';
import { ReceiptDatasetPanel } from '../components/receipt/ReceiptDatasetPanel';
import type { ReceiptExample, ReceiptReview } from '../types/receiptDataset';

export const ScanReceiptPage: React.FC = () => {
  const { user } = useAuth();
  return <ScanReceiptWorkspace key={user?.id || 'guest'} />;
};

const ScanReceiptWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: catalog, reload } = useCatalog();
  const { status, progress, capture, error, scan, reset } = useReceiptScan();
  const [savedExample, setSavedExample] = useState<ReceiptExample | null>(null);
  const [datasetRevision, setDatasetRevision] = useState(0);
  const activeCapture = savedExample || capture;
  const toast = useToast();

  const handleAccept = async (rows: AcceptedRow[], review: ReceiptReview) => {
    if (!activeCapture) throw new Error('Receipt image is unavailable. Please scan again.');
    const receiptId = activeCapture.id;
    const scannedAt = activeCapture.createdAt;
    // Persist the source and labels before any catalog mutation. Storage errors
    // leave the review screen intact so the user can retry without losing edits.
    await receiptDatasetService.saveScan(activeCapture, user?.id);
    await receiptDatasetService.saveReview(receiptId, user?.id, review);
    setDatasetRevision((value) => value + 1);
    await catalogService.saveReceipt({
      id: receiptId,
      userId: user?.id,
      storeName: null,
      scannedAt,
      rawOcrText: activeCapture.rawText,
      lineCount: activeCapture.predictedLines.length,
      acceptedCount: rows.length,
    });

    for (const row of rows) {
      if (row.catalogIngredientId) {
        await catalogService.updateIngredientPrice(
          {
            id: row.catalogIngredientId,
            purchaseQuantity: row.quantity,
            purchaseUnit: row.unit,
            purchaseCost: row.price,
            source: 'receipt',
            receiptId,
          },
          user?.id
        );
      } else {
        await catalogService.addIngredient(
          {
            name: row.itemName,
            purchaseQuantity: row.quantity,
            purchaseUnit: row.unit,
            purchaseCost: row.price,
            source: 'receipt',
            receiptId,
          },
          user?.id
        );
      }
    }

    await reload();
    toast.addToast(
      rows.length
        ? `Saved review and added ${rows.length} ingredient${rows.length === 1 ? '' : 's'} to your catalog.`
        : 'Receipt and review saved on this device.',
      'success'
    );
    // Stay here so pending backup status and the saved review remain visible.
    reset();
    setSavedExample(null);
  };

  const scannerActive =
    status === 'idle' ||
    status === 'converting' ||
    status === 'preprocessing' ||
    status === 'loading-worker' ||
    status === 'recognizing' ||
    status === 'parsing' ||
    status === 'error';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capture"
        title="Scan a receipt"
        description="Read items and prices, then save the receipt photo and your corrections."
        actions={
          <Button variant="ghost" onClick={() => navigate('/catalog')}>
            Back to catalog
          </Button>
        }
      />

      {activeCapture ? (
        // Confirmation gets the full width — there's a lot to review.
        <ReceiptConfirmation
          key={`${activeCapture.id}-${savedExample?.revision || 0}`}
          lines={activeCapture.predictedLines}
          rawText={activeCapture.rawText}
          image={activeCapture.ocrImage}
          initialReview={savedExample?.reviews.at(-1)}
          catalog={catalog}
          onAccept={handleAccept}
          onCancel={() => {
            reset();
            setSavedExample(null);
          }}
        />
      ) : (
        // Scanner + tips side panel.
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 max-w-5xl">
          <div className="min-w-0">
            {scannerActive && (
              <ReceiptScanner
                status={status}
                progress={progress}
                error={error}
                onFile={scan}
                onReset={reset}
              />
            )}
          </div>

          <aside className="space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-clay" aria-hidden="true" />
                Tips for a great scan
              </h3>
              <ul className="space-y-3 text-sm text-ink-700">
                <Tip
                  icon={<Crop className="w-4 h-4" />}
                  title="Fill the frame"
                  body="Crop tight so the receipt fills the viewfinder rectangle. Background clutter confuses the OCR."
                />
                <Tip
                  icon={<FileImage className="w-4 h-4" />}
                  title="Lay it flat"
                  body="Smooth out creases. Curved or wrinkled paper distorts characters."
                />
                <Tip
                  icon={<Sun className="w-4 h-4" />}
                  title="Use good light"
                  body="Even, bright light without glare works best. Natural daylight is great."
                />
                <Tip
                  icon={<Camera className="w-4 h-4" />}
                  title="Shoot straight on"
                  body="Hold the camera parallel to the paper, not at an angle."
                />
              </ul>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-clay" aria-hidden="true" />
                Catalog status
              </h3>
              <p className="text-sm text-ink-500">
                {catalog.length === 0
                  ? 'Your catalog is empty. Scanned items will start filling it up.'
                  : `${catalog.length} ingredient${
                      catalog.length === 1 ? '' : 's'
                    } in your catalog.`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/catalog')}
                className="mt-3 -ml-2"
              >
                Go to catalog
              </Button>
            </div>
          </aside>
        </div>
      )}
      <ReceiptDatasetPanel
        key={user?.id || 'guest'}
        userId={user?.id}
        refreshToken={datasetRevision}
        onReview={setSavedExample}
      />
    </div>
  );
};

const Tip: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
}> = ({ icon, title, body }) => (
  <li className="flex gap-3">
    <span className="shrink-0 mt-0.5 text-clay">{icon}</span>
    <span className="min-w-0">
      <span className="block font-medium text-ink-900">{title}</span>
      <span className="block text-ink-500 leading-snug mt-0.5">{body}</span>
    </span>
  </li>
);
