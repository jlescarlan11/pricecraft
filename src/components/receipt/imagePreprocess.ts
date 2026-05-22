const MAX_LONG_EDGE = 1600;

export async function preprocessImage(file: File | Blob): Promise<Blob> {
  const img = await loadImage(file);
  const { canvas, ctx } = drawScaled(img);
  applyGrayscaleContrast(ctx, canvas.width, canvas.height);
  return canvasToBlob(canvas);
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx };
}

function applyGrayscaleContrast(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  // Contrast lookup table (factor ~1.6 around 128)
  const lut = new Uint8ClampedArray(256);
  const factor = 1.6;
  for (let i = 0; i < 256; i++) {
    const v = Math.round(factor * (i - 128) + 128);
    lut[i] = Math.max(0, Math.min(255, v));
  }
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    const v = lut[gray];
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
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
      'image/png'
    );
  });
}
