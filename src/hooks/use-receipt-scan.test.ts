import { createElement } from 'react';
import { act, renderHook, render, screen } from '@testing-library/react';
import { ReceiptConfirmation } from '../components/receipt/ReceiptConfirmation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReceiptScan } from './use-receipt-scan';

const ocr = vi.hoisted(() => ({ recognize: vi.fn(), preprocess: vi.fn(), groqEnabled: false }));
vi.mock('../services/ocrSpaceService', () => ({
  hasOcrSpaceKey: () => true,
  recognizeWithOcrSpace: ocr.recognize,
}));
vi.mock('../components/receipt/imagePreprocess', () => ({ preprocessImage: ocr.preprocess }));
vi.mock('../services/groqService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/groqService')>()),
  hasGroqKey: () => ocr.groqEnabled,
}));

beforeEach(() => {
  ocr.groqEnabled = false;
  ocr.recognize.mockReset().mockResolvedValue({
    text: 'Rice 1kg 177.00N',
    raw: { ParsedResults: [{ TextOverlay: { Lines: [] } }] },
  });
  ocr.preprocess.mockReset().mockResolvedValue(new Blob(['processed'], { type: 'image/jpeg' }));
});

describe('scan capture provenance', () => {
  it('retains the original and actual OCR image, predictions and model identity for review saving', async () => {
    const file = new File(['original'], 'receipt.png', { type: 'image/png' });
    const { result } = renderHook(() => useReceiptScan());
    await act(() => result.current.scan(file));
    expect(result.current.capture).toMatchObject({
      original: file,
      originalName: 'receipt.png',
      rawText: 'Rice 1kg 177.00N',
      metadata: {
        ocrProvider: 'ocr-space',
        ocrModel: 'engine-2',
        extractor: 'heuristic',
        parserVersion: '2',
      },
      predictedLines: [{ itemName: 'Rice', quantity: 1, unit: 'kg', price: 177 }],
    });
    expect(result.current.capture?.ocrImage).toBe(
      ocr.preprocess.mock.results[0].value instanceof Blob
        ? ocr.preprocess.mock.results[0].value
        : await ocr.preprocess.mock.results[0].value
    );
    act(() => result.current.reset());
    expect(result.current.capture).toBeNull();
  });

  it('does not let an older scan overwrite the source image of a newer scan', async () => {
    let resolveFirst!: (value: unknown) => void;
    ocr.recognize.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );
    const { result } = renderHook(() => useReceiptScan());
    let first!: Promise<void>;
    await act(async () => {
      first = result.current.scan(new File(['one'], 'one.jpg'));
      await Promise.resolve();
    });
    await act(() => result.current.scan(new File(['two'], 'two.jpg')));
    await act(async () => {
      resolveFirst({ text: 'Old receipt 25.00', raw: {} });
      await first;
    });
    expect(result.current.capture?.originalName).toBe('two.jpg');
    expect(result.current.rawText).toBe('Rice 1kg 177.00N');
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('carries the extracted purchased amount through the scan capture into editable review fields', async () => {
  ocr.groqEnabled = true;
  vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
  ocr.recognize.mockResolvedValue({ text: 'Demo Chocolate 200G 22.95V\nTOTAL 22.95', raw: {} });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [{ name: 'Demo Chocolate', quantity: 1, unit: 'g', price: 22.95 }],
              }),
            },
          },
        ],
      }),
    })
  );
  const { result } = renderHook(() => useReceiptScan());
  await act(() =>
    result.current.scan(new File(['original'], 'receipt.png', { type: 'image/png' }))
  );
  expect(result.current.capture?.predictedLines[0]).toMatchObject({ quantity: 200, unit: 'g' });
  render(
    createElement(ReceiptConfirmation, {
      lines: result.current.result!.lines,
      rawText: result.current.rawText,
      catalog: [],
      onAccept: async () => {},
      onCancel: () => {},
    })
  );
  expect(screen.getByLabelText('Qty')).toHaveValue(200);
  expect(screen.getByLabelText('Unit')).toHaveValue('g');
  expect(screen.getByText('OCR: Demo Chocolate 200G 22.95V')).toBeInTheDocument();
});
