const MAX_LONG_EDGE = 1600;

const HEIC_EXTENSIONS = /\.(heic|heif)$/i;
const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

export function isHeic(file: File | Blob): boolean {
  if (HEIC_MIME_TYPES.has((file as File).type || '')) return true;
  if (file instanceof File && HEIC_EXTENSIONS.test(file.name)) return true;
  return false;
}

export type ConversionStage = 'converting-heic' | 'preprocessing';

export interface PreprocessOptions {
  onStage?: (stage: ConversionStage) => void;
}

export async function preprocessImage(
  file: File | Blob,
  options: PreprocessOptions = {}
): Promise<Blob> {
  const looksLikeHeic = isHeic(file);

  // Layered decode strategy:
  //  1. Native createImageBitmap — handles JPEG/PNG/WebP/AVIF everywhere,
  //     and HEIC on Safari natively. Zero deps when it works.
  //  2. heic-to (newer libheif build) — handles modern iPhone HEIC variants
  //     that older libheif builds (heic2any) can't parse.
  //  3. heic2any — older fallback, sometimes succeeds where heic-to doesn't.
  //  4. <img> tag decode — last resort for browser-supported formats.
  let bitmapOrBlob: ImageBitmap | Blob;

  if (looksLikeHeic) {
    options.onStage?.('converting-heic');
    bitmapOrBlob = await decodeHeicWithFallbacks(file);
  } else {
    bitmapOrBlob = await decodeAny(file);
  }

  options.onStage?.('preprocessing');
  const { canvas, ctx } = await drawScaled(bitmapOrBlob);
  // Light-touch only: scale (handled above) + grayscale. We deliberately
  // skip heavy contrast adjustment because Tesseract has its own internal
  // pre-processor (Otsu thresholding) that handles real-world lighting
  // better than our naive percentile stretch on cluttered photos.
  toGrayscale(ctx, canvas.width, canvas.height);
  return canvasToBlob(canvas);
}

function toGrayscale(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
}

async function decodeAny(file: File | Blob): Promise<ImageBitmap | Blob> {
  // Native decode is fastest; falls through to <img> for environments that
  // can't bitmap a given format.
  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file);
    }
  } catch (e) {
    console.warn('createImageBitmap failed, will try <img> decode', e);
  }
  return file;
}

async function decodeHeicWithFallbacks(
  file: File | Blob
): Promise<ImageBitmap | Blob> {
  // Try the browser first — Safari decodes HEIC natively.
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      return bitmap;
    }
  } catch {
    // ignore — try wasm decoders below
  }

  // Try heic-to (newer libheif build).
  try {
    const mod = await import('heic-to');
    const heicTo = mod.heicTo as (args: {
      blob: Blob;
      type: string;
      quality?: number;
    }) => Promise<Blob>;
    const jpeg = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.85,
    });
    return jpeg;
  } catch (e) {
    console.warn('heic-to decode failed, trying heic2any', e);
  }

  // Final fallback: heic2any (older libheif).
  try {
    const mod = await import('heic2any');
    const heic2any = (mod.default ?? mod) as (args: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (e) {
    console.error('All HEIC decoders failed', e);
    throw new Error(
      "We couldn't read this iPhone photo. Open the photo on your phone, tap Share → Save as JPEG, then upload that. (Or switch Camera → Format to \"Most Compatible\" to skip the conversion step in the future.)"
    );
  }
}

function loadImageFromBlob(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          'Could not decode that image. Make sure it is a JPG, PNG, or HEIC photo of a receipt.'
        )
      );
    };
    img.src = url;
  });
}

async function drawScaled(source: ImageBitmap | Blob): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}> {
  let drawable: ImageBitmap | HTMLImageElement;
  let srcWidth: number;
  let srcHeight: number;

  if (source instanceof Blob) {
    const img = await loadImageFromBlob(source);
    drawable = img;
    srcWidth = img.width;
    srcHeight = img.height;
  } else {
    drawable = source;
    srcWidth = source.width;
    srcHeight = source.height;
  }

  // Scale up small images (Tesseract works best at ~300 DPI; small phone
  // crops can be too tiny). Scale down only if much larger than needed.
  const longEdge = Math.max(srcWidth, srcHeight);
  let scale = 1;
  if (longEdge > MAX_LONG_EDGE) scale = MAX_LONG_EDGE / longEdge;
  else if (longEdge < 1000) scale = 1000 / longEdge;

  const width = Math.round(srcWidth * scale);
  const height = Math.round(srcHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(drawable, 0, 0, width, height);

  if (source instanceof ImageBitmap) source.close();

  return { canvas, ctx };
}


function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}
