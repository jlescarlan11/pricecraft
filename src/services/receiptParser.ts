import type { ParsedReceiptLine } from '../types';

const FOOTER_KEYWORDS = [
  'subtotal',
  'total',
  'vat',
  'change',
  'cash',
  'tender',
  'tendered',
  'tin',
  'or no',
  'or#',
  'thank you',
  'thanks',
  'cashier',
  'discount',
  'senior',
  'pwd',
  'balance',
  'amount due',
  'rounding',
];

const UNIT_KEYWORDS = [
  'kg',
  'g',
  'gram',
  'grams',
  'ml',
  'l',
  'liter',
  'liters',
  'pc',
  'pcs',
  'piece',
  'pieces',
  'pack',
  'packs',
  'sachet',
  'sachets',
  'btl',
  'bottle',
  'can',
  'cans',
  'box',
  'boxes',
];

const PRICE_AT_END_RE =
  /(?:₱|P|PHP)?\s*(\d{1,4}(?:,\d{3})*\.\d{2})\s*$/i;

const LEADING_QTY_RE = /^\s*(\d+(?:\.\d+)?)\s*(?:x|@|pcs?|pc)\b\s*/i;

const QTY_UNIT_INLINE_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${UNIT_KEYWORDS.join('|')})\\b`,
  'i'
);

export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFooterLine(text: string): boolean {
  const lower = text.toLowerCase();
  return FOOTER_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractName(raw: string): { name: string; nameHadNoise: boolean } {
  const trimmed = raw.trim();
  // Detect noise: non-alphanumeric characters interspersed in the name
  // (excluding spaces, periods, hyphens, slashes, ampersands).
  const cleaned = trimmed.replace(/[^\p{L}\p{N}\s.&/-]/gu, '').trim();
  const nameHadNoise = cleaned.length < trimmed.length;
  return { name: cleaned || trimmed, nameHadNoise };
}

export function parseLine(rawLine: string): ParsedReceiptLine | null {
  const line = rawLine.trim();
  if (!line) return null;
  if (isFooterLine(line)) return null;

  const priceMatch = line.match(PRICE_AT_END_RE);
  if (!priceMatch) return null;

  const priceStr = priceMatch[1].replace(/,/g, '');
  const price = Number(priceStr);
  if (!Number.isFinite(price) || price <= 0) return null;

  let remainder = line.slice(0, line.length - priceMatch[0].length).trim();
  if (!remainder) return null;

  // Extract leading quantity prefix (e.g. "2x ", "2 @ ")
  let quantity: number | undefined;
  let unit: string | undefined;
  const leadingQty = remainder.match(LEADING_QTY_RE);
  if (leadingQty) {
    quantity = Number(leadingQty[1]);
    remainder = remainder.slice(leadingQty[0].length).trim();
  }

  // Look for inline qty+unit (e.g. "1kg", "500ml", "12pcs")
  const inline = remainder.match(QTY_UNIT_INLINE_RE);
  if (inline) {
    if (quantity === undefined) quantity = Number(inline[1]);
    unit = inline[2].toLowerCase();
    // Normalize plural -> base unit
    if (unit === 'pc' || unit === 'piece' || unit === 'pieces') unit = 'pcs';
    if (unit === 'gram' || unit === 'grams') unit = 'g';
    if (unit === 'liter' || unit === 'liters') unit = 'l';
    if (unit === 'packs') unit = 'pack';
    if (unit === 'sachets') unit = 'sachet';
    if (unit === 'bottle') unit = 'btl';
    if (unit === 'cans') unit = 'can';
    if (unit === 'boxes') unit = 'box';
    remainder = remainder.replace(inline[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // Look for trailing "1 pack" with a space
  if (!unit) {
    const trailing = remainder.match(
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s+(${UNIT_KEYWORDS.join('|')})\\b`, 'i')
    );
    if (trailing) {
      if (quantity === undefined) quantity = Number(trailing[1]);
      unit = trailing[2].toLowerCase();
      if (unit === 'pc' || unit === 'piece' || unit === 'pieces') unit = 'pcs';
      if (unit === 'gram' || unit === 'grams') unit = 'g';
      if (unit === 'liter' || unit === 'liters') unit = 'l';
      if (unit === 'packs') unit = 'pack';
      if (unit === 'sachets') unit = 'sachet';
      if (unit === 'bottle') unit = 'btl';
      if (unit === 'cans') unit = 'can';
      if (unit === 'boxes') unit = 'box';
      remainder = remainder.replace(trailing[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const { name, nameHadNoise } = extractName(remainder);
  if (!name) return null;

  // Confidence: start at 1.0, penalize for missing pieces
  let confidence = 1.0;
  if (!unit) confidence -= 0.2;
  if (quantity === undefined) confidence -= 0.1;
  if (nameHadNoise) confidence -= 0.3;
  if (name.length < 3) confidence -= 0.2;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    rawText: rawLine,
    itemName: name,
    quantity,
    unit,
    price,
    confidence,
  };
}

export interface ParseReceiptResult {
  rawText: string;
  lines: ParsedReceiptLine[];
}

export function parseReceipt(ocrText: string): ParseReceiptResult {
  const lines: ParsedReceiptLine[] = [];
  if (!ocrText || !ocrText.trim()) {
    return { rawText: ocrText, lines };
  }

  for (const rawLine of ocrText.split('\n')) {
    const parsed = parseLine(rawLine);
    if (parsed) lines.push(parsed);
  }

  return { rawText: ocrText, lines };
}

// Fuzzy match against existing catalog names using normalized Levenshtein.
export function findClosestCatalogMatch(
  candidateName: string,
  catalog: { id: string; normalizedName: string }[],
  threshold = 0.25
): string | null {
  const target = normalizeIngredientName(candidateName);
  if (!target) return null;

  let best: { id: string; distance: number } | null = null;
  for (const item of catalog) {
    const distance = levenshtein(target, item.normalizedName);
    const normalized = distance / Math.max(target.length, item.normalizedName.length || 1);
    if (best === null || normalized < best.distance) {
      best = { id: item.id, distance: normalized };
    }
  }
  return best && best.distance <= threshold ? best.id : null;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// Compute price per base unit (g or ml) for ranking/drift comparison.
// Returns the same unit price for "pcs", "pack", etc. (treated as base).
export function pricePerBaseUnit(
  purchaseCost: number,
  purchaseQuantity: number,
  purchaseUnit: string
): number {
  if (purchaseQuantity <= 0) return 0;
  const unit = purchaseUnit.toLowerCase();
  let baseQty = purchaseQuantity;
  if (unit === 'kg') baseQty = purchaseQuantity * 1000; // grams
  else if (unit === 'l') baseQty = purchaseQuantity * 1000; // ml
  return purchaseCost / baseQty;
}
