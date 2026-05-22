import { useCallback, useRef, useState } from 'react';
import { parseReceipt, type ParseReceiptResult } from '../services/receiptParser';
import { preprocessImage } from '../components/receipt/imagePreprocess';

export type ScanStatus =
  | 'idle'
  | 'preprocessing'
  | 'loading-worker'
  | 'recognizing'
  | 'parsing'
  | 'done'
  | 'error';

interface UseReceiptScanState {
  status: ScanStatus;
  progress: number;
  result: ParseReceiptResult | null;
  rawText: string;
  error: string | null;
}

const INITIAL: UseReceiptScanState = {
  status: 'idle',
  progress: 0,
  result: null,
  rawText: '',
  error: null,
};

export function useReceiptScan() {
  const [state, setState] = useState<UseReceiptScanState>(INITIAL);
  const cancelRef = useRef(false);

  const scan = useCallback(async (file: File | Blob) => {
    cancelRef.current = false;
    setState({ ...INITIAL, status: 'preprocessing', progress: 0.02 });

    try {
      const processed = await preprocessImage(file);
      if (cancelRef.current) return;
      setState((s) => ({ ...s, status: 'loading-worker', progress: 0.1 }));

      const { createWorker } = await import('tesseract.js');
      if (cancelRef.current) return;

      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (cancelRef.current) return;
          if (m.status === 'recognizing text') {
            setState((s) => ({
              ...s,
              status: 'recognizing',
              progress: 0.2 + 0.7 * (m.progress || 0),
            }));
          }
        },
      });

      const { data } = await worker.recognize(processed);
      await worker.terminate();
      if (cancelRef.current) return;

      setState((s) => ({ ...s, status: 'parsing', progress: 0.95 }));
      const parsed = parseReceipt(data.text || '');
      setState({
        status: 'done',
        progress: 1,
        result: parsed,
        rawText: data.text || '',
        error: null,
      });
    } catch (e) {
      console.error('Receipt scan failed', e);
      setState({
        status: 'error',
        progress: 0,
        result: null,
        rawText: '',
        error: e instanceof Error ? e.message : 'Scan failed',
      });
    }
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setState(INITIAL);
  }, []);

  return { ...state, scan, reset };
}
