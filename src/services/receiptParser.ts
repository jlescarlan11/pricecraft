import type { ParsedReceiptLine } from '../types';

const FOOTER_KEYWORDS = [
  'subtotal',
  'sub total',
  'sub-total',
  'total',
  'grand total',
  'vat',
  'vatable',
  'change',
  'cash',
  'tender',
  'tendered',
  'tin',
  'or no',
  'or#',
  'or num',
  'thank you',
  'thanks',
  'cashier',
  'discount',
  'senior',
  'pwd',
  'balance',
  'amount due',
  'amt due',
  'rounding',
  'rounded',
  'transaction',
  'invoice',
  'receipt',
  'pos',
  'date',
  'time',
  'sold to',
  'card',
  'visa',
  'mastercard',
  'gcash',
  'maya',
  'paymaya',
  'qr',
  'reference',
  'auth',
  'approval',
  'change due',
  'service charge',
];

const UNIT_KEYWORDS = [
  'kg',
  'kgs',
  'g',
  'gram',
  'grams',
  'ml',
  'l',
  'liter',
  'liters',
  'litre',
  'pc',
  'pcs',
  'piece',
  'pieces',
  'pack',
  'packs',
  'pck',
  'sachet',
  'sachets',
  'btl',
  'bottle',
  'can',
  'cans',
  'box',
  'boxes',
  'dz',
  'dozen',
  'tub',
  'jar',
  'roll',
  'bag',
];

// Find every plausible currency-shaped token in a line. We'll pick the best
// candidate (rightmost, with decimals) as the price.
const PRICE_TOKEN_RE =
  /(?:₱|P|PHP|Php)?\s*(\d{1,4}(?:[,. ]\d{3})*[.,]\d{1,2})|(?:₱|PHP)\s*(\d{1,5})/gi;

const LEADING_QTY_RE = /^\s*(\d+(?:\.\d+)?)\s*(?:x|@|pcs?|pc)\b\s*/i;
const QTY_UNIT_INLINE_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${UNIT_KEYWORDS.join('|')})\\b`,
  'i'
);

// Detect lines that are obviously product codes / barcodes / SKUs:
// long runs of digits with little or no letters.
const SKU_LIKE_RE = /^\s*[\d-]{7,}\s*$/;

export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFooterLine(text: string): boolean {
  const lower = text.toLowerCase();
  return FOOTER_KEYWORDS.some((kw) => {
    // Match whole-word-ish; "totally" shouldn't trigger "total".
    if (kw.length < 5) {
      const re = new RegExp(`\\b${kw}\\b`, 'i');
      return re.test(lower);
    }
    return lower.includes(kw);
  });
}

// Repair common OCR digit confusions inside a numeric token.
function repairDigits(token: string): string {
  return token
    .replace(/O/g, '0')
    .replace(/o/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8')
    .replace(/Z/g, '2');
}

function extractName(raw: string): { name: string; nameHadNoise: boolean } {
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/[^\p{L}\p{N}\s.&/-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const nameHadNoise = cleaned.length < trimmed.length;
  return { name: cleaned || trimmed, nameHadNoise };
}

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase();
  if (u === 'pc' || u === 'piece' || u === 'pieces') return 'pcs';
  if (u === 'gram' || u === 'grams') return 'g';
  if (u === 'liter' || u === 'liters' || u === 'litre') return 'l';
  if (u === 'kgs') return 'kg';
  if (u === 'packs' || u === 'pck') return 'pack';
  if (u === 'sachets') return 'sachet';
  if (u === 'bottle') return 'btl';
  if (u === 'cans') return 'can';
  if (u === 'boxes') return 'box';
  if (u === 'dozen' || u === 'dz') return 'dozen';
  return u;
}

function parsePriceToken(tok: string): number | null {
  let s = tok
    .replace(/[₱$]/g, '')
    .replace(/\bPHP\b/gi, '')
    .replace(/^\s*P\b/i, '')
    .replace(/[a-zA-Z]\s*$/, '')
    .replace(/\s+/g, '')
    .trim();
  s = repairDigits(s);
  if (/,\d{1,2}$/.test(s) && !/\.\d/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface PriceCandidate {
  raw: string;
  value: number;
  index: number;
  hasDecimal: boolean;
}

function findAllPrices(line: string): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];
  // Reset state if regex is global.
  const re = new RegExp(PRICE_TOKEN_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const raw = m[1] || m[2];
    if (!raw) continue;
    const value = parsePriceToken(raw);
    if (value === null) continue;
    candidates.push({
      raw,
      value,
      index: m.index,
      hasDecimal: /[.,]\d{1,2}$/.test(raw),
    });
  }
  return candidates;
}

function pickLineTotal(line: string): PriceCandidate | null {
  const all = findAllPrices(line);
  if (all.length === 0) return null;
  // Prefer rightmost token with a decimal; otherwise rightmost overall.
  const withDecimal = all.filter((c) => c.hasDecimal);
  if (withDecimal.length > 0) return withDecimal[withDecimal.length - 1];
  return all[all.length - 1];
}

export function parseLine(rawLine: string): ParsedReceiptLine | null {
  const line = rawLine.trim();
  if (!line || line.length < 3) return null;
  if (SKU_LIKE_RE.test(line)) return null;
  if (isFooterLine(line)) return null;

  const total = pickLineTotal(line);
  if (!total) return null;
  const price = total.value;
  const lowConfidenceMatch = !total.hasDecimal;

  // Strip the chosen price token (and any trailing letter marker like "V")
  // from the line, leaving the item description.
  let remainder = (
    line.slice(0, total.index) +
    ' ' +
    line
      .slice(total.index + total.raw.length)
      .replace(/^\s*[a-zA-Z]\s*$/, '')
  )
    .replace(/[₱$]|\bPHP\b|^\s*P\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!remainder) return null;

  // If a second numeric token appears before the total, it's usually a unit
  // price in a "QTY ITEM UNIT_PRICE TOTAL" layout — strip it.
  const inlineNum = remainder.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s*$/);
  if (inlineNum) {
    const prev = parsePriceToken(inlineNum[1]);
    if (
      prev !== null &&
      prev <= price + 0.01 &&
      remainder.length > inlineNum[0].length + 2
    ) {
      remainder = remainder.slice(0, remainder.length - inlineNum[0].length).trim();
    }
  }

  let quantity: number | undefined;
  let unit: string | undefined;

  const leadingQty = remainder.match(LEADING_QTY_RE);
  if (leadingQty) {
    quantity = Number(leadingQty[1]);
    remainder = remainder.slice(leadingQty[0].length).trim();
  }

  const inline = remainder.match(QTY_UNIT_INLINE_RE);
  if (inline) {
    if (quantity === undefined) quantity = Number(inline[1]);
    unit = normalizeUnit(inline[2]);
    remainder = remainder.replace(inline[0], ' ').replace(/\s+/g, ' ').trim();
  }

  if (!unit) {
    const trailing = remainder.match(
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s+(${UNIT_KEYWORDS.join('|')})\\b`, 'i')
    );
    if (trailing) {
      if (quantity === undefined) quantity = Number(trailing[1]);
      unit = normalizeUnit(trailing[2]);
      remainder = remainder.replace(trailing[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const { name, nameHadNoise } = extractName(remainder);
  if (!name || name.length < 2) return null;

  // Reject if the "name" is just numbers / punctuation.
  if (!/[a-zA-Z]{2,}/.test(name)) return null;

  let confidence = 1.0;
  if (lowConfidenceMatch) confidence -= 0.2;
  if (!unit) confidence -= 0.15;
  if (quantity === undefined) confidence -= 0.1;
  if (nameHadNoise) confidence -= 0.2;
  if (name.length < 4) confidence -= 0.15;
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

// Categories on POS receipts often appear as their own line above the actual
// item, sometimes carrying the item's price ("*** TAKEOUT  305.00V"). Strip
// the marker but float any price down to the next item line so the parser
// can pair it with the actual product name.
const CATEGORY_MARKERS = [
  'TAKEOUT',
  'TAKE OUT',
  'TAKE-OUT',
  'TAKEDUT', // common OCR misread
  'DINE IN',
  'DINE-IN',
  'DINEIN',
  'DELIVERY',
  'EAT IN',
];

function preprocessReceiptText(ocrText: string): string {
  const cleaned: string[] = [];
  const lines = ocrText.split('\n');
  let pendingPrice: string | null = null;

  for (const raw of lines) {
    let line = raw.replace(/[*•·●○■□]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!line) {
      continue;
    }

    const isMarker = CATEGORY_MARKERS.some((m) =>
      new RegExp(`^${m.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(line)
    );
    if (isMarker) {
      const priceMatch = line.match(/(\d{1,4}(?:[,.]\d{3})*[.,]\d{1,2})V?\s*$/i);
      if (priceMatch) {
        pendingPrice = priceMatch[1];
      }
      continue; // drop the marker line itself
    }

    // Drop lonely punctuation/single-char artifacts.
    if (line.length < 2 || !/[a-zA-Z0-9]/.test(line)) continue;

    if (pendingPrice && !/\d+[.,]\d{2}/.test(line)) {
      line = `${line}    ${pendingPrice}`;
      pendingPrice = null;
    } else {
      pendingPrice = null;
    }
    cleaned.push(line);
  }

  return cleaned.join('\n');
}

export function parseReceipt(ocrText: string): ParseReceiptResult {
  const lines: ParsedReceiptLine[] = [];
  if (!ocrText || !ocrText.trim()) {
    return { rawText: ocrText, lines };
  }

  const preprocessed = preprocessReceiptText(ocrText);

  const rawLines = preprocessed.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < rawLines.length; i++) {
    const current = rawLines[i];

    const parsed = parseLine(current);
    if (parsed) {
      lines.push(parsed);
      continue;
    }

    // Only combine if `current` looks like a real item name (≥ 2 alpha words)
    // AND the very next line is essentially a price-only line. This prevents
    // gluing items to unrelated sub-info ("3 PCS x 0.00").
    const looksLikeName =
      /\b[a-zA-Z]{2,}\b.*\b[a-zA-Z]{2,}\b/.test(current) &&
      !/\d+[.,]\d{2}/.test(current);
    if (looksLikeName && i + 1 < rawLines.length) {
      const next = rawLines[i + 1];
      const nextIsPriceOnly =
        /^[\s$@₱P]*\d{1,4}(?:[,.]\d{3})*[.,]\d{1,2}\s*V?\s*$/i.test(next);
      if (nextIsPriceOnly) {
        const combined = `${current}    ${next}`;
        const combinedParsed = parseLine(combined);
        if (combinedParsed) {
          combinedParsed.confidence = Math.max(0, combinedParsed.confidence - 0.05);
          lines.push(combinedParsed);
          i++;
        }
      }
    }
  }

  return { rawText: ocrText, lines };
}

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

export function pricePerBaseUnit(
  purchaseCost: number,
  purchaseQuantity: number,
  purchaseUnit: string
): number {
  if (purchaseQuantity <= 0) return 0;
  const unit = purchaseUnit.toLowerCase();
  let baseQty = purchaseQuantity;
  if (unit === 'kg') baseQty = purchaseQuantity * 1000;
  else if (unit === 'l') baseQty = purchaseQuantity * 1000;
  return purchaseCost / baseQty;
}
