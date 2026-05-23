// OCR.space hosted OCR. Free tier: 25k requests/month, no card. The free
// engines are MUCH better than Tesseract.js on real-world thermal receipts.
//
// Setup: get a free key at https://ocr.space/ocrapi and put it in .env.local:
//   VITE_OCR_SPACE_API_KEY=your-key-here

const ENDPOINT = 'https://api.ocr.space/parse/image';
const MAX_BYTES = 1024 * 1024; // free-tier file-size limit

export function hasOcrSpaceKey(): boolean {
  const key = import.meta.env.VITE_OCR_SPACE_API_KEY;
  return typeof key === 'string' && key.length > 0;
}

export interface OcrSpaceResult {
  text: string;
  raw: unknown;
}

interface OcrSpaceParsedResult {
  ParsedText?: string;
  ErrorMessage?: string | string[];
  FileParseExitCode?: number;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  OCRExitCode?: number;
}

// Compress to JPEG with decreasing quality until under MAX_BYTES.
async function compressToUnder(file: Blob, max: number): Promise<Blob> {
  if (file.size <= max) return file;

  const bitmap =
    typeof createImageBitmap === 'function'
      ? await createImageBitmap(file)
      : null;

  const canvas = document.createElement('canvas');
  if (bitmap) {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
  } else {
    // Fall back to <img>
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const i = new Image();
      i.onload = () => {
        URL.revokeObjectURL(url);
        resolve(i);
      };
      i.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      i.src = url;
    });
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
  }
  if (bitmap) {
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
  }

  const tryEncode = (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob null'))),
        'image/jpeg',
        quality
      )
    );

  for (const q of [0.85, 0.7, 0.55, 0.4, 0.25]) {
    const blob = await tryEncode(q);
    if (blob.size <= max) return blob;
  }
  // Last resort: aggressively downscale.
  const scale = Math.sqrt(max / canvas.width / canvas.height) * 1000;
  const w = Math.max(640, Math.round(canvas.width * scale));
  const h = Math.max(640, Math.round(canvas.height * scale));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  small.getContext('2d')!.drawImage(canvas, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    small.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('downscale toBlob null'))),
      'image/jpeg',
      0.7
    )
  );
}

export async function recognizeWithOcrSpace(file: Blob): Promise<OcrSpaceResult> {
  const key = import.meta.env.VITE_OCR_SPACE_API_KEY as string | undefined;
  if (!key) throw new Error('Missing VITE_OCR_SPACE_API_KEY');

  const upload = await compressToUnder(file, MAX_BYTES);

  const form = new FormData();
  form.append('apikey', key);
  form.append('language', 'eng');
  form.append('isOverlayRequired', 'false');
  form.append('detectOrientation', 'true');
  form.append('scale', 'true');
  form.append('isTable', 'true');
  // OCR.space "Engine 2" is much better at thermal receipts; falls back to
  // engine 1 automatically if engine 2 fails.
  form.append('OCREngine', '2');
  form.append('file', upload, 'receipt.jpg');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`OCR.space HTTP ${res.status}`);
  }
  const json = (await res.json()) as OcrSpaceResponse;

  if (json.IsErroredOnProcessing) {
    const msg = Array.isArray(json.ErrorMessage)
      ? json.ErrorMessage.join('; ')
      : json.ErrorMessage || `OCRExitCode ${json.OCRExitCode}`;
    throw new Error(`OCR.space: ${msg}`);
  }

  const parsed = (json.ParsedResults || [])
    .map((r) => r.ParsedText || '')
    .join('\n')
    .trim();

  return { text: parsed, raw: json };
}
