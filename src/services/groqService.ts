// Groq-hosted LLM for structured extraction from receipt OCR text.
// Free tier: ~14k requests/day, ~30/minute. No card required.
//
// Setup: get a free key at https://console.groq.com → API Keys, then add to
// .env.local:
//   VITE_GROQ_API_KEY=gsk_...

import type { ParsedReceiptLine } from '../types';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
// 70B reasons hierarchically about receipt structure (parent items, sub-line
// breakdowns, OCR error recovery) much better than 8B. Still free on Groq's
// free tier; the per-minute limits are lower but receipt scans are infrequent.
const MODEL = 'llama-3.3-70b-versatile';

export function hasGroqKey(): boolean {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return typeof key === 'string' && key.length > 0;
}

interface GroqItem {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  price?: unknown;
}

interface GroqResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

const SYSTEM_PROMPT = `# ROLE
You are a receipt parser. You read raw OCR text from a point-of-sale receipt
and return ONLY the billable line items as structured JSON.

# ENVIRONMENT
The OCR text could come from any vendor: grocery, restaurant, food stall,
online order export, sari-sari store, pharmacy, fast-food combo receipt,
salon, etc. Layouts vary wildly. The OCR is noisy: characters get misread
(notably "@" → "8"), spacing is inconsistent, lines may be split or merged,
and section markers may or may not exist. You CANNOT assume any specific
receipt format.

The downstream consumer is a human reviewing your output before it lands in
their expense log. Missing a real purchase is worse than including a slightly
messy one — but emitting fake items, sub-components as separate purchases, or
totals-as-items is the worst outcome because it silently inflates their books.

# GOAL
Extract every billable line item the customer was actually charged for, exactly
once each, with the correct final price. Exclude everything else.

# OUTPUT FORMAT
Return ONLY valid JSON, this exact shape, no prose, no markdown fences:
{"items": [{"name": string, "quantity": number|null, "unit": string|null, "price": number}, ...]}

# DEFINITIONS
A "billable line item" has two properties:
  (a) a human-readable product or service name, AND
  (b) a final per-line price in the receipt's currency that the customer paid.

A "sub-component" is a line that describes part of a billed parent item
(meal inclusion, price breakdown, add-on selection, size pick). Sub-components
are NEVER emitted as separate items.

# RULES

1. EXCLUDE non-billable lines:
   - Totals: subtotal, grand total, total due, balance, amount due.
   - Tax: VAT, sales tax, service charge, tax exempt summaries.
   - Discounts/promos: LESS, PROMO, SENIOR, PWD, COUPON, ROUND-OFF.
   - Payments: cash, change, tendered, GCash, Maya, Visa, Mastercard, card,
     gift card, store credit, platform names on online orders.
   - Header/footer: store name, address, TIN, OR number, cashier, txn id,
     date/time stamps, thank-you messages, return policy.
   - Section markers: lines that label a section rather than a product.
     Patterns: "*** TAKEOUT", "DINE-IN", "FOOD", "BEVERAGES", "GROCERY",
     or anything all-caps that doesn't name a product. If a marker carries
     a price, that price belongs to the NEXT product line, not the marker.

2. EXCLUDE sub-component breakdowns. Once you've emitted a billed parent, do
   NOT emit lines beneath it that describe its contents. Signals of a sub-line:
   - Indented or shifted-right beneath a main item.
   - Price prefixed with "@" — ALWAYS a unit/component cost, never a charge.
     Lines containing "@" are NEVER billable items.
   - Names a component (sauce, side, drink, base) often followed by
     "None", "Regular", "Included".
   - Name with no price, sandwiched between billed lines.

3. AUTHORITATIVE PRICE:
   - When a section header carries a price and the next product line has none,
     the header's price IS the product's total. Emit the product with that price.
   - If a sub-line below shows a different number ("3 PCS x 80.00", "Base
     Price @275.00", "@30.00"), that number is NEVER authoritative.
   - OCR commonly misreads "@" as "8". "3 PCS x 80.00" under a parent priced
     at 0 is almost certainly "3 PCS x @0.00" — three pieces at zero each.
     Trust the parent.
   - Mental check: if parent price is 0 and a sub-line implies non-zero unit
     price, you're being fooled by OCR. Keep the parent's 0.

4. MERGE duplicates:
   - N identical billable lines (same name, same per-line price) → ONE object
     with quantity = N and price = (per-line price × N).
   - Distinct items sharing part of a name stay separate.

5. QUANTITY:
   - "3 PCS x 25.00 = 75.00" or "3 @ 25" → quantity 3, price 75 (line total).
   - "Coca-Cola 1.5L" → quantity 1; "1.5L" is the size, not the count.
   - Duplicates merged per rule 4 → quantity = N.

6. UNIT: one of kg, g, l, ml, pcs, pack, sachet, btl, can, box, dozen — or
   null if unclear.

7. PRICE: total spent on this item (after rule 4 merging). Strip currency
   symbols and tax-marker letters (V, N, Z). Plain number.

8. NAME: cleaned, human-readable. Drop leading asterisks, bullets, category
   prefixes, obvious OCR noise. Keep brand/variant.

9. AMBIGUOUS lines: prefer to include (the human will review). But never emit
   a row whose name is gibberish or whose price isn't a number.

# EXAMPLES

## Example 1 — simple grocery, no markers
Read each line as-is. Merge duplicates. Drop summary lines.

INPUT:
SUNNY MART
Flour APUR 1kg              65.00
White Sugar 1kg             72.00
Eggs Large 12pcs            96.00
COKE 1.5L                   80.00
COKE 1.5L                   80.00
SUBTOTAL                   393.00
VAT 12%                     42.11
TOTAL                      393.00
CASH                       400.00
CHANGE                       7.00

OUTPUT:
{"items":[
  {"name":"Flour APUR","quantity":1,"unit":"kg","price":65},
  {"name":"White Sugar","quantity":1,"unit":"kg","price":72},
  {"name":"Eggs Large","quantity":12,"unit":"pcs","price":96},
  {"name":"COKE 1.5L","quantity":2,"unit":null,"price":160}
]}

## Example 2 — combo meal with section markers and sub-components
Header carries the bundle price; sub-lines describe meal contents.

INPUT:
*** SECTION    0.00V
Plain Box S
2 PCS x @0.00
*** SECTION    420.00V
Burger Combo
*** SECTION
Base Price @380.00
Beef Patty
Soft Drink 16oz
@40.00
Curly Fries Reg
Chicken Strips 3pc    180.00V
*** SECTION
Combo Add-on Ranch Dip
None
Chicken Strips 3pc    180.00V
*** SECTION
Combo Add-on BBQ Dip
None
SUBTOTAL    780.00

OUTPUT:
{"items":[
  {"name":"Plain Box S","quantity":2,"unit":"pcs","price":0},
  {"name":"Burger Combo","quantity":1,"unit":null,"price":420},
  {"name":"Chicken Strips 3pc","quantity":2,"unit":null,"price":360}
]}

Reasoning:
- Plain Box S: header price 0 → price 0. "2 PCS x @0.00" gives count 2 and
  unit 0; OCR may show "80.00" — ignore, trust the parent's 0.
- Burger Combo: header price 420. Everything beneath (Base Price, Beef Patty,
  Soft Drink, @40.00, Curly Fries) is meal contents — skip.
- Chicken Strips 3pc: billed twice at 180. Merge to qty 2, price 360. The
  "Combo Add-on" + "None" lines are dip selections, not separate purchases.
- SUBTOTAL excluded.

Return ONLY the JSON object.`;


function coerceNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.,-]/g, '').replace(/,/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function coerceString(v: unknown): string | undefined {
  if (typeof v === 'string') {
    const t = v.trim();
    return t ? t : undefined;
  }
  return undefined;
}

export async function extractItemsWithGroq(
  ocrText: string
): Promise<ParsedReceiptLine[]> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!key) throw new Error('Missing VITE_GROQ_API_KEY');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: ocrText },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as GroqResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned no content');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Groq returned invalid JSON');
  }

  const items: GroqItem[] = Array.isArray(parsed)
    ? (parsed as GroqItem[])
    : Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: GroqItem[] }).items)
      : [];

  const result: ParsedReceiptLine[] = [];
  for (const item of items) {
    const name = coerceString(item.name);
    const price = coerceNumber(item.price);
    if (!name || !price || price <= 0) continue;
    result.push({
      rawText: '',
      itemName: name,
      quantity: coerceNumber(item.quantity),
      unit: coerceString(item.unit)?.toLowerCase(),
      price,
      confidence: 0.95,
    });
  }
  return result;
}
