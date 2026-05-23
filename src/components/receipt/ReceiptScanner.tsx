import React, { useRef, useState } from 'react';
import { Camera, RotateCcw, Upload } from 'lucide-react';
import { Button } from '../shared';
import type { ScanStatus } from '../../hooks/use-receipt-scan';
import { CameraCapture } from './CameraCapture';

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
    case 'converting':
      return 'Converting iPhone photo… (this can take a few seconds)';
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
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const handleCameraCapture = (blob: Blob) => {
    setCameraOpen(false);
    // Wrap the Blob in a File so the rest of the pipeline can read .name etc.
    const file = new File([blob], `receipt-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    onFile(file);
  };

  const cameraSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  const busy =
    status === 'converting' ||
    status === 'preprocessing' ||
    status === 'loading-worker' ||
    status === 'recognizing' ||
    status === 'parsing';

  return (
    <>
    {cameraOpen && (
      <CameraCapture
        onCapture={handleCameraCapture}
        onCancel={() => setCameraOpen(false)}
      />
    )}
    <div className="bg-white p-xl rounded-xl border border-border-base shadow-sm">
      <div className="flex flex-col items-center text-center gap-md py-lg">
        <Camera className="w-10 h-10 text-clay" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-medium text-ink-900">Scan a receipt</h2>
          <p className="text-ink-500 text-sm mt-xs max-w-md">
            For best results: lay the receipt flat on a plain surface, fill the
            frame, and use good light. We&apos;ll read it in your browser — nothing
            uploads — and you confirm every line before saving.
          </p>
          <ul className="text-xs text-ink-500 mt-md max-w-md mx-auto text-left list-disc pl-md space-y-xs">
            <li>Crop tight — don&apos;t include hands, the floor, or the background.</li>
            <li>Smooth out any creases or folds before taking the photo.</li>
            <li>Hold the camera parallel to the paper, not at an angle.</li>
          </ul>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        {status === 'idle' && (
          <div className="flex flex-col sm:flex-row gap-sm w-full max-w-sm">
            {cameraSupported && (
              <Button
                variant="primary"
                onClick={() => setCameraOpen(true)}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-xs" aria-hidden="true" />
                Open camera
              </Button>
            )}
            <Button
              variant={cameraSupported ? 'secondary' : 'primary'}
              onClick={() => fileRef.current?.click()}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-xs" aria-hidden="true" />
              Upload a photo
            </Button>
          </div>
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
    </>
  );
};
