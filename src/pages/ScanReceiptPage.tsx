import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useReceiptScan } from '../hooks/use-receipt-scan';
import { useCatalog } from '../hooks/use-catalog';
import { useAuth } from '../context/AuthContext';
import { ReceiptScanner, ReceiptConfirmation } from '../components/receipt';
import type { AcceptedRow } from '../components/receipt';
import { catalogService } from '../services/catalogService';
import { useToast } from '../components/shared/Toast';
import { Button } from '../components/shared';

export const ScanReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: catalog, reload } = useCatalog();
  const { status, progress, result, rawText, error, scan, reset } = useReceiptScan();
  const toast = useToast();

  const handleAccept = async (rows: AcceptedRow[]) => {
    const receiptId = catalogService.genId();
    const scannedAt = new Date().toISOString();
    await catalogService.saveReceipt({
      id: receiptId,
      userId: user?.id,
      storeName: null,
      scannedAt,
      rawOcrText: rawText,
      lineCount: result?.lines.length || 0,
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
          },
          user?.id
        );
      }
    }

    await reload();
    toast.addToast(
      `Added ${rows.length} ingredient${rows.length === 1 ? '' : 's'} to your catalog.`,
      'success'
    );
    navigate('/catalog');
  };

  return (
    <div className="space-y-xl max-w-3xl mx-auto">
      <div className="border-b border-border-subtle pb-lg flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Scan a receipt</h1>
          <p className="text-ink-500 mt-sm">
            OCR runs in your browser. The photo never leaves your device.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/catalog')}>
          Back to catalog
        </Button>
      </div>

      {status === 'idle' && (
        <ReceiptScanner
          status={status}
          progress={progress}
          error={error}
          onFile={scan}
          onReset={reset}
        />
      )}
      {(status === 'preprocessing' ||
        status === 'loading-worker' ||
        status === 'recognizing' ||
        status === 'parsing' ||
        status === 'error') && (
        <ReceiptScanner
          status={status}
          progress={progress}
          error={error}
          onFile={scan}
          onReset={reset}
        />
      )}
      {status === 'done' && result && (
        <ReceiptConfirmation
          lines={result.lines}
          rawText={rawText}
          catalog={catalog}
          onAccept={handleAccept}
          onCancel={reset}
        />
      )}
    </div>
  );
};
