import React, { useRef } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { Button } from '../shared';
import type { ScanStatus } from '../../hooks/use-receipt-scan';

interface ReceiptScannerProps {
  status: ScanStatus;
  progress: number;
  error: string | null;
  onFile: (file: File) => void;
  onReset: () => void;
}

const statusLabel = (status: ScanStatus): string => {
  switch (status) {
    case 'idle':
      return 'Ready';
    case 'preprocessing':
      return 'Preparing image…';
    case 'loading-worker':
      return 'Loading OCR engine…';
    case 'recognizing':
      return 'Reading receipt…';
    case 'parsing':
      return 'Extracting items…';
    case 'done':
      return 'Done';
    case 'error':
      return 'Something went wrong';
  }
};

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  status,
  progress,
  error,
  onFile,
  onReset,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const busy =
    status === 'preprocessing' ||
    status === 'loading-worker' ||
    status === 'recognizing' ||
    status === 'parsing';

  return (
    <div className="bg-white p-xl rounded-xl border border-border-base shadow-sm">
      <div className="flex flex-col items-center text-center gap-md py-lg">
        <Camera className="w-10 h-10 text-clay" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-medium text-ink-900">Scan a receipt</h2>
          <p className="text-ink-500 text-sm mt-xs max-w-md">
            Hold the receipt flat under good light. We&apos;ll read items and prices —
            you&apos;ll confirm everything before it&apos;s saved.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        {status === 'idle' && (
          <Button variant="primary" onClick={() => fileRef.current?.click()}>
            Take photo / upload
          </Button>
        )}
        {busy && (
          <div className="w-full max-w-md">
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-clay transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-sm text-ink-500 mt-sm">{statusLabel(status)}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-md">
            <p className="text-sm text-rust">{error || 'Scan failed.'}</p>
            <Button variant="secondary" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-xs" aria-hidden="true" />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
