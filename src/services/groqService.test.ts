import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractItemsWithGroq } from './groqService';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function response(items: unknown[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({ items }) } }] }),
  });
}

describe('Groq quantity evidence', () => {
  it('retains source weights and pack sizes even when the model returns package counts', async () => {
    response([
      { name: 'FC PORK BELLY', quantity: 1, unit: null, price: 134.3 },
      { name: 'BARNUTS CHOCO-PEANUZ', quantity: 1, unit: 'g', price: 22.95 },
      { name: 'PAN2 BLCK RICE', quantity: 1, unit: null, price: 177 },
    ]);
    const rows = await extractItemsWithGroq(
      'FC PORK BELLY\n134.30元7\n0.34 KG x @395.00\nBARNUTS CHOCO-PEANUZ 200G 22.95V\nPAN2 BLCK RICE 2V 177.00N\nTOTAL 334.25'
    );
    expect(rows[0]).toMatchObject({ quantity: 0.34, unit: 'kg', price: 134.3 });
    expect(rows[1]).toMatchObject({ quantity: 200, unit: 'g', price: 22.95 });
    expect(rows[2].quantity).toBeUndefined();
    expect(rows[2].unit).toBeUndefined();
    expect(rows[0].rawText).toContain('0.34 KG x @395.00');
    expect(rows[1].rawText).toContain('200G');
  });

  it('does not replace a merged purchase with the quantity of a single pack', async () => {
    response([{ name: 'Milk', quantity: 3, unit: 'l', price: 160 }]);
    const rows = await extractItemsWithGroq('Milk 1.5L 80.00\nMilk 1.5L 80.00\nTOTAL 160.00');
    expect(rows[0]).toMatchObject({ quantity: 3, unit: 'l', price: 160 });
  });

  it('does not attach evidence ambiguously or to another item with the same price', async () => {
    response([{ name: 'Milk', quantity: null, unit: null, price: 80 }]);
    const rows = await extractItemsWithGroq('Milk 1L 80.00\nMilk 500ml 80.00\nJuice 200ml 80.00');
    expect(rows[0].quantity).toBeUndefined();
    expect(rows[0].rawText).toBe('');
  });
});

it('keeps a valid model weight from a continuation the line parser cannot read', async () => {
  response([{ name: 'Demo Apples', quantity: 0.5, unit: 'kg', price: 100 }]);
  const rows = await extractItemsWithGroq(
    'Demo Apples 100.00\nNET WEIGHT: 0.5 kilograms\nTOTAL 100.00'
  );
  expect(rows[0]).toMatchObject({ quantity: 0.5, unit: 'kg', price: 100 });
});

it.each([
  ['kilograms', 'kg'],
  ['grams', 'g'],
  ['litres', 'l'],
  ['milliliters', 'ml'],
  ['pieces', 'pcs'],
  ['packs', 'pack'],
  ['bottles', 'btl'],
])('normalizes model unit %s for the review dropdown', async (unit, expectedUnit) => {
  response([{ name: 'Demo Apples', quantity: 2, unit, price: 100 }]);
  const rows = await extractItemsWithGroq(
    `Demo Apples tray 100.00\nQUANTITY: 2 ${unit}\nTOTAL 100.00`
  );
  expect(rows[0]).toMatchObject({ quantity: 2, unit: expectedUnit });
});

it.each([0, -2, '', 'n/a', null])(
  'does not populate an invalid model quantity %j',
  async (quantity) => {
    response([{ name: 'Demo Apples', quantity, unit: 'kg', price: 100 }]);
    const rows = await extractItemsWithGroq('Demo Apples tray 100.00\nTOTAL 100.00');
    expect(rows[0].quantity).toBeUndefined();
  }
);

it('leaves unsupported model units unknown instead of supplying a value missing from the dropdown', async () => {
  response([{ name: 'Demo Apples', quantity: 2, unit: 'bushels', price: 100 }]);
  const rows = await extractItemsWithGroq('Demo Apples tray 100.00\nTOTAL 100.00');
  expect(rows[0].unit).toBeUndefined();
});

it('keeps purchased volume for count times pack-size expressions', async () => {
  response([{ name: 'Demo Milk', quantity: 3, unit: 'l', price: 160 }]);
  const rows = await extractItemsWithGroq('2 x Demo Milk 1.5L 160.00\nTOTAL 160.00');
  expect(rows[0]).toMatchObject({ quantity: 3, unit: 'l', price: 160 });
});

it('matches a model name retaining a printed pack size to its source amount', async () => {
  response([{ name: 'Demo Chocolate 200G', quantity: 1, unit: 'g', price: 22.95 }]);
  const rows = await extractItemsWithGroq('Demo Chocolate 200G 22.95V\nTOTAL 22.95');
  expect(rows[0]).toMatchObject({
    quantity: 200,
    unit: 'g',
    price: 22.95,
    rawText: 'Demo Chocolate 200G 22.95V',
  });
});

it.each([
  'Demo Milk 1.5L 2 BTL 160.00',
  'Demo Milk 2 btl 1.5L 160.00',
  'Demo Milk 1.5L x 2 160.00',
])('does not replace total purchased volume with one size or count from %s', async (text) => {
  response([{ name: 'Demo Milk', quantity: 3, unit: 'l', price: 160 }]);
  const rows = await extractItemsWithGroq(`${text}\nTOTAL 160.00`);
  expect(rows[0]).toMatchObject({ quantity: 3, unit: 'l', price: 160 });
});

it('does not attach a merged purchase to a different-size single row sharing the total price', async () => {
  response([
    { name: 'Demo Milk 1.5L', quantity: 3, unit: 'l', price: 160 },
    { name: 'Demo Milk 1L', quantity: 1, unit: 'l', price: 160 },
  ]);
  const rows = await extractItemsWithGroq(
    'Demo Milk 1.5L 80.00\nDemo Milk 1.5L 80.00\nDemo Milk 1L 160.00\nTOTAL 320.00'
  );
  expect(rows[0]).toMatchObject({ quantity: 3, unit: 'l', price: 160, rawText: '' });
  expect(rows[1]).toMatchObject({
    quantity: 1,
    unit: 'l',
    price: 160,
    rawText: 'Demo Milk 1L 160.00',
  });
});

it('does not borrow a single source amount when the model omits the variant size from a merged name', async () => {
  response([{ name: 'Demo Milk', quantity: 3, unit: 'l', price: 160 }]);
  const rows = await extractItemsWithGroq(
    'Demo Milk 1.5L 80.00\nDemo Milk 1.5L 80.00\nDemo Milk 1L 160.00\nTOTAL 320.00'
  );
  expect(rows[0]).toMatchObject({ quantity: 3, unit: 'l', price: 160, rawText: '' });
});

it.each(['x', '×'])(
  'retains a math-validated weight continuation using %s without an @ sign',
  async (symbol) => {
    response([{ name: 'Demo Pork Belly', quantity: 1, unit: null, price: 113.4 }]);
    const rows = await extractItemsWithGroq(
      `Demo Pork Belly 113.40\n0.27 KG ${symbol} 420.00\nTOTAL 113.40`
    );
    expect(rows[0]).toMatchObject({ quantity: 0.27, unit: 'kg', price: 113.4 });
  }
);
