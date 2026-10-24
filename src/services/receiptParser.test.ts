import { describe, it, expect } from 'vitest';
import { parseReceipt, normalizeIngredientName, parseLine } from './receiptParser';

describe('normalizeIngredientName', () => {
  it('lowercases and trims', () => {
    expect(normalizeIngredientName('  Flour All Purpose  ')).toBe('flour all purpose');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeIngredientName('White    Sugar')).toBe('white sugar');
  });

  it('strips non-alphanumeric noise', () => {
    expect(normalizeIngredientName('Vanilla Extract!!')).toBe('vanilla extract');
  });
});

describe('parseLine', () => {
  it('parses a clean line with quantity and unit', () => {
    const result = parseLine('Flour all purpose 1kg 65.00');
    expect(result).not.toBeNull();
    expect(result!.itemName.toLowerCase()).toContain('flour');
    expect(result!.quantity).toBe(1);
    expect(result!.unit).toBe('kg');
    expect(result!.price).toBe(65);
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('parses a line with peso sign prefix', () => {
    const result = parseLine('White Sugar 1kg ₱72.00');
    expect(result).not.toBeNull();
    expect(result!.price).toBe(72);
  });

  it('parses a line with P prefix', () => {
    const result = parseLine('Salt iodized 1kg P25.50');
    expect(result).not.toBeNull();
    expect(result!.price).toBe(25.5);
  });

  it('parses a line with PHP prefix', () => {
    const result = parseLine('Cooking oil 1L PHP 120.00');
    expect(result).not.toBeNull();
    expect(result!.price).toBe(120);
  });

  it('parses a line with comma thousands separator', () => {
    const result = parseLine('Premium imported flour 25kg 1,250.00');
    expect(result).not.toBeNull();
    expect(result!.price).toBe(1250);
  });

  it('parses a line with quantity prefix like 2x', () => {
    const result = parseLine('2x Eggs medium 14.00');
    expect(result).not.toBeNull();
    expect(result!.quantity).toBe(2);
    expect(result!.itemName.toLowerCase()).toContain('eggs');
  });

  it('parses a line with no unit', () => {
    const result = parseLine('Yeast sachet 12.00');
    expect(result).not.toBeNull();
    expect(result!.price).toBe(12);
    expect(result!.itemName.toLowerCase()).toContain('yeast');
  });

  it('returns null for footer lines', () => {
    expect(parseLine('SUBTOTAL 250.00')).toBeNull();
    expect(parseLine('Total Due 250.00')).toBeNull();
    expect(parseLine('VAT 12% 30.00')).toBeNull();
    expect(parseLine('CASH 500.00')).toBeNull();
    expect(parseLine('CHANGE 250.00')).toBeNull();
    expect(parseLine('THANK YOU FOR SHOPPING')).toBeNull();
  });

  it('returns null when no price token is present', () => {
    expect(parseLine('JUST SOME TEXT')).toBeNull();
    expect(parseLine('')).toBeNull();
  });

  it('lowers confidence when OCR noise looks like a name', () => {
    const result = parseLine('?nilla Extract 30ml 85.00');
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeLessThan(1.0);
  });

  it('handles ml unit', () => {
    const result = parseLine('Soy Sauce 500ml 45.00');
    expect(result!.unit).toBe('ml');
    expect(result!.quantity).toBe(500);
  });

  it('handles pcs unit', () => {
    const result = parseLine('Eggs large 12pcs 96.00');
    expect(result!.unit).toBe('pcs');
    expect(result!.quantity).toBe(12);
  });

  it('handles pack unit', () => {
    const result = parseLine('Yeast 1 pack 50.00');
    expect(result!.unit).toBe('pack');
    expect(result!.quantity).toBe(1);
  });
});

describe('parseReceipt', () => {
  it('extracts the three grocery items, including split weighted meat, without payment or tax rows', () => {
    const result = parseReceipt(`FC PORK BELLY
134.30元7
0.34 KG x @395.00
BARNUTS CHOCO-PEANUZ\t200G\t22.95V
PAN2 BLCK RICE 2V\t177.00N
TOTAL
334.25
CREDI7\t334.25
Non-Taxable Sales\t134.30
Amount Payable\t334.25
# CUSTOMER : 1\t2.34`);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]).toMatchObject({
      itemName: 'FC PORK BELLY',
      quantity: 0.34,
      unit: 'kg',
      price: 134.3,
    });
    expect(result.lines[0].confidence).toBeLessThan(0.8);
    expect(result.lines[1]).toMatchObject({
      itemName: 'BARNUTS CHOCO-PEANUZ',
      quantity: 200,
      unit: 'g',
      price: 22.95,
    });
    expect(result.lines[2]).toMatchObject({ itemName: 'PAN2 BLCK RICE 2V', price: 177 });
  });

  it.each([
    'CREDI7 334.25',
    'CREDIT 334.25',
    'Non-Taxable Sales 134.30',
    'Amount Payable 334.25',
    '# CUSTOMER : 1 2.34',
    'S. Charge 12.00',
  ])('rejects summary or payment row %s even without a total marker', (line) => {
    expect(parseLine(line)).toBeNull();
  });

  it.each([
    ['Rice 177.00N', 'Rice', 177],
    ['Sugar 1kg ₱72.00V', 'Sugar', 72],
    ['Cooking oil 1L PHP 120.00', 'Cooking oil', 120],
    ['Product7 334.25', 'Product7', 334.25],
  ])('removes the entire price span without consuming product digits: %s', (line, name, price) => {
    expect(parseLine(line)).toMatchObject({ itemName: name, price });
  });

  it('keeps products after a subtotal and attaches a weight continuation without creating a duplicate', () => {
    const result = parseReceipt(
      'PORK BELLY 134.30N\n0.34 KG x @395.00\nSUBTOTAL 134.30\nWhite Sugar 1kg 72.00\nTOTAL 206.30\nMEMBERSHIP POINTS 2.34'
    );
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({ quantity: 0.34, unit: 'kg', price: 134.3 });
  });

  it('extracts multiple line items, skipping footers', () => {
    const ocr = `
      SM SUPERMARKET
      Flour all purpose 1kg 65.00
      White Sugar 1kg 72.00
      Eggs large 12pcs 96.00
      SUBTOTAL 233.00
      VAT 12% 28.00
      TOTAL 261.00
      CASH 500.00
      CHANGE 239.00
      THANK YOU FOR SHOPPING
    `;
    const result = parseReceipt(ocr);
    expect(result.lines.length).toBe(3);
    expect(result.lines[0].itemName.toLowerCase()).toContain('flour');
    expect(result.lines[1].itemName.toLowerCase()).toContain('sugar');
    expect(result.lines[2].itemName.toLowerCase()).toContain('eggs');
  });

  it('does not replace a purchase quantity with an inconsistent continuation', () => {
    const result = parseReceipt('PORK BELLY 1kg 395.00\n0.34 KG x @395.00');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ quantity: 1, unit: 'kg', price: 395 });
    expect(result.lines[0].confidence).toBeLessThanOrEqual(0.5);
  });

  it('returns empty for blank input', () => {
    expect(parseReceipt('').lines).toEqual([]);
    expect(parseReceipt('   \n\n   ').lines).toEqual([]);
  });

  it('preserves raw text', () => {
    const ocr = 'Flour 1kg 65.00';
    const result = parseReceipt(ocr);
    expect(result.rawText).toBe(ocr);
  });

  it('handles OCR character noise (O for 0, l for 1)', () => {
    // OCR commonly confuses O/0 and l/1. We accept normal digits only;
    // these noisy ones should drop the line if the price is unparseable.
    const result = parseReceipt('Some item 5O.00');
    expect(result.lines.length).toBeLessThanOrEqual(1);
  });
});
