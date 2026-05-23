import { useCallback, useRef, useState } from 'react';
import { parseReceipt, type ParseReceiptResult } from '../services/receiptParser';
import { preprocessImage } from '../components/receipt/imagePreprocess';
import { hasOcrSpaceKey, recognizeWithOcrSpace } from '../services/ocrSpaceService';
import { hasGroqKey, extractItemsWithGroq } from '../services/groqService';

export type ScanStatus =
  | 'idle'
  | 'converting'
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
      // Preprocess for accuracy. If preprocessing fails (e.g. unusual format),
      // fall back to handing the original file to Tesseract directly — it can
      // accept Blobs and may still produce usable text.
      let imageForOcr: File | Blob;
      try {
        imageForOcr = await preprocessImage(file, {
          onStage: (stage) => {
            if (cancelRef.current) return;
            if (stage === 'converting-heic') {
              setState((s) => ({ ...s, status: 'converting', progress: 0.04 }));
            } else if (stage === 'preprocessing') {
              setState((s) => ({ ...s, status: 'preprocessing', progress: 0.08 }));
            }
          },
        });
      } catch (preErr) {
        console.warn('Preprocess failed, falling back to raw image', preErr);
        // If HEIC conversion itself failed, surface that — the raw HEIC blob
        // is useless to <img> / Tesseract anyway.
        if (preErr instanceof Error && /iPhone|HEIC/i.test(preErr.message)) {
          throw preErr;
        }
        imageForOcr = file;
      }
      if (cancelRef.current) return;

      // Helper: given OCR text, try Groq for structured extraction; on any
      // failure fall back to the heuristic parser.
      const buildResult = async (text: string): Promise<ParseReceiptResult> => {
        if (hasGroqKey() && text.trim().length > 20) {
          try {
            const items = await extractItemsWithGroq(text);
            if (items.length > 0) {
              return { rawText: text, lines: items };
            }
          } catch (e) {
            console.warn('Groq extraction failed, falling back to heuristic', e);
          }
        }
        return parseReceipt(text);
      };

      // Prefer OCR.space if we have an API key — much better on real receipts.
      if (hasOcrSpaceKey()) {
        try {
          setState((s) => ({ ...s, status: 'recognizing', progress: 0.3 }));
          const { text } = await recognizeWithOcrSpace(imageForOcr);
          if (cancelRef.current) return;
          setState((s) => ({ ...s, status: 'parsing', progress: 0.95 }));
          const parsed = await buildResult(text);
          if (parsed.lines.length > 0 || text.trim().length > 50) {
            setState({
              status: 'done',
              progress: 1,
              result: parsed,
              rawText: text,
              error: null,
            });
            return;
          }
          // Cloud succeeded but content was thin; fall through to Tesseract.
          console.warn('OCR.space returned thin content, trying Tesseract');
        } catch (cloudErr) {
          console.warn('OCR.space failed, falling back to Tesseract', cloudErr);
        }
      }

      setState((s) => ({ ...s, status: 'loading-worker', progress: 0.1 }));

      const { createWorker, PSM } = await import('tesseract.js');
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

      // Structure-preserving modes first; SPARSE_TEXT only as last resort
      // because it doesn't return usable line/bbox structure for regrouping.
      const modesToTry = [
        PSM.SINGLE_BLOCK, // 6 — best when receipt fills the frame
        PSM.SINGLE_COLUMN, // 4 — variable-size column of text
        PSM.AUTO, // 3 — default auto layout
        PSM.SPARSE_TEXT, // 11 — fallback, sparse layout
      ];

      const scoreText = (txt: string): number => {
        const prices = (txt.match(/\d+[.,]\d{2}/g) || []).length;
        const words = (txt.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
        return prices * 8 + words;
      };

      // Reconstruct visual rows from line-level bounding boxes. Tesseract
      // already groups words into lines; using line bboxes (more stable
      // than individual words) and a generous Y tolerance lets us pair an
      // item name in one Tesseract "line" with its price token that ended
      // up in another Tesseract "line" because of the wide column gap or
      // a slight skew in the photo.
      interface LineEntry {
        text: string;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }

      const reconstructRowsFromLines = (
        lines: LineEntry[],
        toleranceFactor: number
      ): string => {
        if (!lines || lines.length === 0) return '';
        const heights = lines
          .map((l) => Math.max(1, l.bbox.y1 - l.bbox.y0))
          .sort((a, b) => a - b);
        const medianH = heights[Math.floor(heights.length / 2)] || 12;
        const tolerance = medianH * toleranceFactor;

        const sorted = [...lines].sort((a, b) => {
          const aYC = (a.bbox.y0 + a.bbox.y1) / 2;
          const bYC = (b.bbox.y0 + b.bbox.y1) / 2;
          if (Math.abs(aYC - bYC) > tolerance) return aYC - bYC;
          return a.bbox.x0 - b.bbox.x0;
        });

        const rows: string[] = [];
        let cur: LineEntry[] = [];
        let curYC = 0;
        for (const ln of sorted) {
          const yC = (ln.bbox.y0 + ln.bbox.y1) / 2;
          if (cur.length === 0) {
            cur = [ln];
            curYC = yC;
          } else if (Math.abs(yC - curYC) <= tolerance) {
            cur.push(ln);
            curYC = (curYC * (cur.length - 1) + yC) / cur.length;
          } else {
            cur.sort((a, b) => a.bbox.x0 - b.bbox.x0);
            rows.push(cur.map((x) => x.text.trim()).filter(Boolean).join('  '));
            cur = [ln];
            curYC = yC;
          }
        }
        if (cur.length > 0) {
          cur.sort((a, b) => a.bbox.x0 - b.bbox.x0);
          rows.push(cur.map((x) => x.text.trim()).filter(Boolean).join('  '));
        }
        return rows.join('\n');
      };

      let bestText = '';
      let bestScore = 0;
      for (const psm of modesToTry) {
        if (cancelRef.current) return;
        await worker.setParameters({
          tessedit_pageseg_mode: psm,
          preserve_interword_spaces: '1',
        });
        try {
          // Request blocks so we get word-level bbox data for spatial regroup.
          const result = (await worker.recognize(imageForOcr, {}, {
            text: true,
            blocks: true,
          })) as { data: { text?: string; blocks?: unknown } };
          const data = result.data;
          const rawTxt = data.text || '';

          // Walk blocks → paragraphs → lines, collecting line-level entries.
          const allLines: LineEntry[] = [];
          const blocks = (data.blocks || []) as Array<{
            paragraphs?: Array<{
              lines?: Array<{
                text?: string;
                bbox?: { x0: number; y0: number; x1: number; y1: number };
                words?: Array<{
                  text?: string;
                  bbox?: { x0: number; y0: number; x1: number; y1: number };
                }>;
              }>;
            }>;
          }>;
          for (const b of blocks) {
            for (const p of b.paragraphs || []) {
              for (const ln of p.lines || []) {
                if (!ln.bbox) continue;
                const lineText =
                  (ln.text || '').trim() ||
                  (ln.words || [])
                    .map((w) => w.text || '')
                    .filter(Boolean)
                    .join(' ');
                if (!lineText) continue;
                allLines.push({ text: lineText, bbox: ln.bbox });
              }
            }
          }

          // Try several tolerances. Tight tolerances preserve detail; loose
          // tolerances pair skewed columns. Pick the best-scoring result.
          const tolerances = [0.5, 0.8, 1.2, 1.6, 2.5];
          const labeled: Array<{ label: string; text: string; score: number }> = [
            { label: 'raw', text: rawTxt, score: scoreText(rawTxt) },
          ];
          for (const tol of tolerances) {
            const t = reconstructRowsFromLines(allLines, tol);
            labeled.push({ label: `tol-${tol}`, text: t, score: scoreText(t) });
          }
          labeled.sort((a, b) => b.score - a.score);
          const best = labeled[0];
          if (best.score > bestScore) {
            bestScore = best.score;
            bestText = best.text;
          }
          // Don't early-exit on a marginal result; run all PSMs for the
          // best receipt reading.
        } catch (recErr) {
          console.warn('PSM attempt failed', psm, recErr);
        }
      }

      await worker.terminate();

      const data = { text: bestText };
      if (cancelRef.current) return;

      setState((s) => ({ ...s, status: 'parsing', progress: 0.95 }));
      const parsed = await buildResult(data.text || '');
      setState({
        status: 'done',
        progress: 1,
        result: parsed,
        rawText: data.text || '',
        error: null,
      });
    } catch (e) {
      // Get the most useful message we can out of unknown error shapes.
      let message = 'Scan failed.';
      if (e instanceof Error && e.message) {
        message = e.message;
      } else if (e && typeof e === 'object') {
        const ev = e as { type?: string; message?: string };
        if (ev.message) message = ev.message;
        else if (ev.type === 'error')
          message =
            'The OCR engine failed to load. Check your internet connection and try again — Tesseract downloads its language data on first run.';
      }
      console.error('Receipt scan failed:', message);
      setState({
        status: 'error',
        progress: 0,
        result: null,
        rawText: '',
        error: message,
      });
    }
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setState(INITIAL);
  }, []);

  return { ...state, scan, reset };
}
