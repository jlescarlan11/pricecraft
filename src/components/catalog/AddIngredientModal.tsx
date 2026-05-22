import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '../shared';
import type { NewIngredientInput } from '../../services/catalogService';

interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: NewIngredientInput) => Promise<void>;
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kilogram (kg)' },
  { value: 'g', label: 'gram (g)' },
  { value: 'l', label: 'liter (l)' },
  { value: 'ml', label: 'milliliter (ml)' },
  { value: 'pcs', label: 'pieces (pcs)' },
  { value: 'pack', label: 'pack' },
  { value: 'sachet', label: 'sachet' },
  { value: 'btl', label: 'bottle' },
  { value: 'can', label: 'can' },
  { value: 'box', label: 'box' },
];

export const AddIngredientModal: React.FC<AddIngredientModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [purchaseUnit, setPurchaseUnit] = useState('kg');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setPurchaseQuantity('1');
    setPurchaseUnit('kg');
    setPurchaseCost('');
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = Number(purchaseQuantity);
    const cost = Number(purchaseCost);
    if (!name.trim()) {
      setError('Please give the ingredient a name.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Purchase quantity must be greater than zero.');
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('Price must be greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        purchaseQuantity: qty,
        purchaseUnit,
        purchaseCost: cost,
      });
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add ingredient"
      footer={
        <div className="flex gap-md justify-end">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={saving}>
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-md">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Flour all purpose"
          required
        />
        <div className="grid grid-cols-2 gap-md">
          <Input
            label="Purchase quantity"
            type="number"
            value={purchaseQuantity}
            onChange={(e) => setPurchaseQuantity(e.target.value)}
            min={0}
            step={0.01}
          />
          <Select
            label="Unit"
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value)}
            options={UNIT_OPTIONS}
          />
        </div>
        <Input
          label="Price (₱)"
          type="number"
          value={purchaseCost}
          onChange={(e) => setPurchaseCost(e.target.value)}
          currency
          min={0}
          step={0.01}
          placeholder="e.g. 65"
        />
        {error && <p className="text-sm text-rust">{error}</p>}
      </form>
    </Modal>
  );
};
