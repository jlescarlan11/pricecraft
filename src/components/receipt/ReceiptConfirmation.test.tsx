import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReceiptConfirmation } from './ReceiptConfirmation';

const lines = [
  {
    rawText: 'Rice 1kg 177.00N',
    itemName: 'Rice',
    quantity: 1,
    unit: 'kg',
    price: 177,
    confidence: 0.95,
  },
  { rawText: 'Amount Payable 177.00', itemName: 'Amount Payable', price: 177, confidence: 0.75 },
];

describe('receipt review labels', () => {
  it('keeps catalog exclusion separate from a verified product and records explicit negative labels', async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    render(
      <ReceiptConfirmation
        lines={lines}
        rawText="raw"
        catalog={[]}
        onAccept={accept}
        onCancel={() => {}}
      />
    );
    fireEvent.change(screen.getAllByLabelText('Review label')[0], { target: { value: 'product' } });
    fireEvent.click(screen.getByLabelText('Add Rice to catalog'));
    fireEvent.change(screen.getAllByLabelText('Review label')[1], {
      target: { value: 'not-product' },
    });
    fireEvent.click(screen.getByLabelText(/checked the whole receipt/i));
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(accept).toHaveBeenCalled());
    const [accepted, review] = accept.mock.calls[0];
    expect(accepted).toEqual([]);
    expect(review.complete).toBe(true);
    expect(review.rows[0]).toMatchObject({
      sourceIndex: 0,
      label: 'product',
      includeInCatalog: false,
      values: { itemName: 'Rice', quantity: 1, unit: 'kg', price: 177 },
    });
    expect(review.rows[1]).toMatchObject({
      sourceIndex: 1,
      label: 'not-product',
      includeInCatalog: false,
    });
  });

  it('does not label unchecked or unreviewed predictions as training ground truth', async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    render(
      <ReceiptConfirmation
        lines={lines}
        rawText="raw"
        catalog={[]}
        onAccept={accept}
        onCancel={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(accept).toHaveBeenCalled());
    expect(accept.mock.calls[0][1]).toMatchObject({
      complete: false,
      rows: [{ label: 'unreviewed' }, { label: 'unreviewed' }],
    });
  });

  it('allows adding a missed item to an empty extraction and saves the correction', async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    render(
      <ReceiptConfirmation
        lines={[]}
        rawText="Unreadable OCR"
        catalog={[]}
        onAccept={accept}
        onCancel={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /add another item/i }));
    fireEvent.change(screen.getByLabelText('Item'), { target: { value: 'Pork belly' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '0.34' } });
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'kg' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '134.30' } });
    fireEvent.click(screen.getByRole('button', { name: /save review and add 1/i }));
    await waitFor(() => expect(accept).toHaveBeenCalled());
    expect(accept.mock.calls[0][0][0]).toMatchObject({ quantity: 0.34, unit: 'kg', price: 134.3 });
    expect(accept.mock.calls[0][1].rows[0]).toMatchObject({ sourceIndex: null, label: 'product' });
  });

  it('requires an explicit purchase quantity for catalog entries and surfaces storage failure', async () => {
    const accept = vi.fn().mockRejectedValue(new Error('Storage is full'));
    render(
      <ReceiptConfirmation
        lines={[{ ...lines[0], quantity: undefined }]}
        rawText="raw"
        catalog={[]}
        onAccept={accept}
        onCancel={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText('Review label'), { target: { value: 'product' } });
    fireEvent.click(screen.getByRole('button', { name: /save review and add 1/i }));
    expect(accept).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/quantity/i);
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /save review and add 1/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Storage is full'));
    expect(screen.getByLabelText('Item')).toHaveValue('Rice');
  });
});
