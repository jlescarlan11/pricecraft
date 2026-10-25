import { describe, expect, it } from 'vitest';
import { extractItemsWithGroq } from './groqService';

// Explicit opt-in: calls the real Groq API using VITE_GROQ_API_KEY.
// PRICECRAFT_LIVE_GROQ=1 npm test -- --run src/services/groqService.live.test.ts
// This is the OCR text from the fictional walkthrough receipt, not user data.
const FICTIONAL_RECEIPT = `FICTIONAL DEMO STORE
TEST RECEIPT - NOT A REAL PURCHASE
Date: 25 October 2026
Receipt: DEMO-20261025-A
Demo Flour 1kg\t65.00
Demo Sugar 1kg\t72.00
Demo Eggs 12pcs\t96.00
TOTAL\t233.00
CASH\t250.00
CHANGE\t17.00
FICTIONAL DATA FOR PRICECRAFT QA`;

describe.skipIf(process.env.PRICECRAFT_LIVE_GROQ !== '1')('live Groq receipt extraction', () => {
  it('extracts purchased amounts from weighted goods and pack sizes', async () => {
    const items = await extractItemsWithGroq(`FICTIONAL TRAINING CHECK - NOT A PURCHASE
Demo Pork Belly
113.40N
0.27 KG x @420.00
Demo Chocolate 150G 36.50V
Demo Rice 88.00N
TOTAL 237.90
CREDIT 237.90`);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      itemName: 'Demo Pork Belly',
      quantity: 0.27,
      unit: 'kg',
      price: 113.4,
    });
    expect(items[1]).toMatchObject({
      itemName: 'Demo Chocolate',
      quantity: 150,
      unit: 'g',
      price: 36.5,
    });
    expect(items[2]).toMatchObject({ itemName: 'Demo Rice', price: 88 });
    expect(items[2].quantity).toBeUndefined();
    expect(items[2].unit).toBeUndefined();
  }, 30_000);

  it('extracts the three fictional purchases through the real service without fallback', async () => {
    const items = await extractItemsWithGroq(FICTIONAL_RECEIPT);

    expect(
      items.map(({ itemName, quantity, unit, price }) => ({ itemName, quantity, unit, price }))
    ).toEqual([
      { itemName: 'Demo Flour', quantity: 1, unit: 'kg', price: 65 },
      { itemName: 'Demo Sugar', quantity: 1, unit: 'kg', price: 72 },
      { itemName: 'Demo Eggs', quantity: 12, unit: 'pcs', price: 96 },
    ]);
  }, 30_000);
});
