import React, { useRef, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Select } from '../shared/Select';
import { Modal } from '../shared/Modal';
import { Switch } from '../shared/Switch';
import {
  calculateIngredientCostFromPurchase,
  UNIT_OPTIONS,
} from '../../utils/calculations';
import { triggerHapticFeedback } from '../../utils/haptics';
import type { Ingredient } from '../../types/calculator';
import { CatalogPicker } from '../catalog';
import type { CatalogIngredient } from '../../types';

interface IngredientRowProps {
  ingredient: Ingredient;
  index: number;
  onUpdate: (id: string, field: keyof Ingredient, value: string | number | boolean) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  errors?: {
    name?: string;
    amount?: string;
    cost?: string;
    purchaseQuantity?: string;
    purchaseCost?: string;
    recipeQuantity?: string;
  };
  isOnlyRow: boolean;
  autoFocus?: boolean;
  catalogItems?: CatalogIngredient[];
}

export const IngredientRow: React.FC<IngredientRowProps> = ({
  ingredient,
  onUpdate,
  onRemove,
  onAdd,
  errors,
  isOnlyRow,
  autoFocus = false,
  catalogItems = [],
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isCatalogLinked = !!ingredient.catalogIngredientId;

  const handleLinkCatalog = (item: CatalogIngredient) => {
    onUpdate(ingredient.id, 'catalogIngredientId', item.id);
    if (!ingredient.name?.trim()) {
      onUpdate(ingredient.id, 'name', item.name);
    }
    onUpdate(ingredient.id, 'measurementMode', 'advanced');
    onUpdate(ingredient.id, 'purchaseQuantity', item.purchaseQuantity);
    onUpdate(ingredient.id, 'purchaseUnit', item.purchaseUnit);
    onUpdate(ingredient.id, 'purchaseCost', item.purchaseCost);
    const recipeQty = Number(ingredient.recipeQuantity || item.purchaseQuantity);
    const recipeUnit = ingredient.recipeUnit || item.purchaseUnit;
    onUpdate(ingredient.id, 'recipeQuantity', recipeQty);
    onUpdate(ingredient.id, 'recipeUnit', recipeUnit);
    const cost = calculateIngredientCostFromPurchase(
      item.purchaseQuantity,
      item.purchaseUnit,
      item.purchaseCost,
      recipeQty,
      recipeUnit
    );
    onUpdate(ingredient.id, 'cost', cost || 0);
    onUpdate(ingredient.id, 'amount', recipeQty);
  };

  const handleUnlinkCatalog = () => {
    onUpdate(ingredient.id, 'catalogIngredientId', '');
  };

  useEffect(() => {
    if (autoFocus && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [autoFocus]);

  const handleDeleteClick = () => {
    if (isOnlyRow) {
      setShowDeleteModal(true);
    } else {
      setIsDeleting(true);
      triggerHapticFeedback(50);
      // Wait for animation to finish before removing
      setTimeout(() => {
        onRemove(ingredient.id);
      }, 300);
    }
  };

  const confirmDelete = () => {
    setIsDeleting(true);
    setShowDeleteModal(false);
    triggerHapticFeedback(50);
    setTimeout(() => {
      onRemove(ingredient.id);
    }, 300);
  };

  const handleChange = (field: keyof Ingredient, value: string | number | boolean) => {
    // Basic update first
    onUpdate(ingredient.id, field, value);

    // Merge with existing ingredient props to get the full picture for calculation
    const updatedIngredient = { ...ingredient, [field]: value };

    // If useFullQuantity is on, sync recipe fields when purchase fields change
    if (updatedIngredient.useFullQuantity) {
      if (field === 'purchaseQuantity') {
        onUpdate(ingredient.id, 'recipeQuantity', value);
        updatedIngredient.recipeQuantity = Number(value);
      }
      if (field === 'purchaseUnit') {
        onUpdate(ingredient.id, 'recipeUnit', value);
        updatedIngredient.recipeUnit = String(value);
      }
    }

    if (
      ['purchaseQuantity', 'purchaseUnit', 'purchaseCost', 'recipeQuantity', 'recipeUnit'].includes(
        field
      )
    ) {
      const cost = calculateIngredientCostFromPurchase(
        Number(updatedIngredient.purchaseQuantity || 0),
        updatedIngredient.purchaseUnit || '',
        Number(updatedIngredient.purchaseCost || 0),
        Number(updatedIngredient.recipeQuantity || 0),
        updatedIngredient.recipeUnit || ''
      );

      if (cost !== null) {
        onUpdate(ingredient.id, 'cost', cost);
        // Sync 'amount' field for compatibility
        onUpdate(ingredient.id, 'amount', updatedIngredient.recipeQuantity || 0);
      } else {
        onUpdate(ingredient.id, 'cost', 0);
      }
    }
  };

  const handleToggleFullQuantity = (checked: boolean) => {
    onUpdate(ingredient.id, 'useFullQuantity', checked);
    
    if (checked) {
      // Sync immediately
      const newRecipeQuantity = ingredient.purchaseQuantity || 0;
      const newRecipeUnit = ingredient.purchaseUnit || '';
      
      onUpdate(ingredient.id, 'recipeQuantity', newRecipeQuantity);
      onUpdate(ingredient.id, 'recipeUnit', newRecipeUnit);
      onUpdate(ingredient.id, 'amount', newRecipeQuantity);

      // Recalculate cost
      const cost = calculateIngredientCostFromPurchase(
        Number(ingredient.purchaseQuantity || 0),
        ingredient.purchaseUnit || '',
        Number(ingredient.purchaseCost || 0),
        Number(newRecipeQuantity),
        newRecipeUnit
      );
      onUpdate(ingredient.id, 'cost', cost || 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Only add on Enter if not in a textarea/select (standard form behavior)
      e.preventDefault(); 
      onAdd();
    } else if (e.key === 'Delete' && e.shiftKey) {
      e.preventDefault();
      handleDeleteClick();
    }
  };

  return (
    <div
      className={`
        relative transition-all duration-300
        ${isDeleting ? 'opacity-0 -translate-y-4' : 'opacity-100'}
        /* Mobile: Card Layout */
        flex flex-col gap-4 p-4 mb-4 rounded-xl border border-border-subtle bg-surface shadow-sm
        /* Desktop: Row Layout */
        md:flex-col md:gap-0 md:p-0 md:mb-0 md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:py-md
      `}
      onKeyDown={handleKeyDown}
    >
      {/* Top Row: Name and Tools */}
      <div className="flex flex-col md:flex-row gap-md items-start md:items-center md:mb-sm">
        <div className="w-full md:flex-1 flex gap-sm items-end">
          <Input
            ref={nameInputRef}
            label="Ingredient Name"
            value={ingredient.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Flour"
            error={errors?.name}
            required
            className="flex-1"
          />
          <div className="pb-1">
            <CatalogPicker
              items={catalogItems}
              selectedId={ingredient.catalogIngredientId}
              onSelect={handleLinkCatalog}
              onClear={handleUnlinkCatalog}
            />
          </div>
        </div>

        {/* Delete Button (Desktop Position) */}
        <div className="hidden md:block pt-6">
           <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 text-ink-500 hover:text-rust hover:bg-rust/5"
            onClick={handleDeleteClick}
            aria-label={`Remove ${ingredient.name || 'ingredient'}`}
            title="Remove ingredient (Shift+Delete)"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Input Area */}
      <div className="rounded-lg transition-all duration-300 overflow-hidden md:bg-surface/50 md:border md:border-border-subtle md:p-md">
        <div className="grid grid-cols-1 gap-6 md:gap-md animate-in fade-in slide-in-from-top-2">
            {/* Purchase Row */}
            <div className="grid grid-cols-2 md:grid-cols-12 gap-sm items-center">
              <span className="col-span-2 md:col-span-2 text-xs font-bold text-ink-500 uppercase tracking-wider mb-1 md:mb-0">
                Purchase Details
              </span>
              
              <div className="col-span-1 md:col-span-3">
                  <Input
                      type="number"
                      placeholder="Qty"
                      value={ingredient.purchaseQuantity || ''}
                      onChange={(e) => handleChange('purchaseQuantity', e.target.value)}
                      min={0}
                      step="any"
                      className="text-sm"
                      label="Quantity"
                      hideLabel
                      error={errors?.purchaseQuantity}
                      disabled={isCatalogLinked}
                  />
              </div>

              <div className="col-span-1 md:col-span-3">
                    <Select
                      label="Unit"
                      hideLabel
                      options={UNIT_OPTIONS}
                      value={ingredient.purchaseUnit || ''}
                      onChange={(e) => handleChange('purchaseUnit', e.target.value)}
                      placeholder="Unit"
                      className="text-sm"
                      disabled={isCatalogLinked}
                  />
              </div>

              <div className="col-span-2 md:col-span-4 md:pl-xs">
                    <Input
                      type="number"
                      placeholder="Total Cost"
                      value={ingredient.purchaseCost || ''}
                      onChange={(e) => handleChange('purchaseCost', e.target.value)}
                      min={0}
                      step="0.01"
                      currency
                      className="text-sm"
                      label="Cost"
                      hideLabel
                      error={errors?.purchaseCost}
                      disabled={isCatalogLinked}
                  />
              </div>
            </div>

            {/* Toggle Row */}
            <div className="md:ml-[16.666%] flex items-center">
              <Switch
                checked={!!ingredient.useFullQuantity}
                onChange={handleToggleFullQuantity}
                label="Use 100% of purchase quantity"
              />
            </div>
            
            {/* Usage Row */}
            <div className="grid grid-cols-2 md:grid-cols-12 gap-sm items-center">
              <span className="col-span-2 md:col-span-2 text-xs font-bold text-ink-500 uppercase tracking-wider mb-1 md:mb-0">
                Recipe Details
              </span>
              
              <div className="col-span-1 md:col-span-3">
                  <Input
                      type="number"
                      placeholder="Qty"
                      value={ingredient.recipeQuantity || ''}
                      onChange={(e) => handleChange('recipeQuantity', e.target.value)}
                      min={0}
                      step="any"
                      className="text-sm"
                      label="Quantity"
                      hideLabel
                      disabled={ingredient.useFullQuantity}
                      error={errors?.recipeQuantity}
                  />
              </div>
              
              <div className="col-span-1 md:col-span-3">
                  <Select
                      label="Unit"
                      hideLabel
                      options={UNIT_OPTIONS}
                      value={ingredient.recipeUnit || ''}
                      onChange={(e) => handleChange('recipeUnit', e.target.value)}
                      placeholder="Unit"
                      className="text-sm"
                      disabled={ingredient.useFullQuantity}
                  />
              </div>

              <div className="col-span-2 md:col-span-4 md:pl-xs mt-2 md:mt-0">
                  <div className="flex items-center gap-xs px-3 py-2 bg-surface md:bg-white rounded border border-border-subtle shadow-sm">
                      <span className="text-xs text-ink-500 font-medium uppercase">Cost:</span>
                      <span className="font-mono font-medium text-ink-900 ml-auto">
                          {ingredient.cost ? `₱${Number(ingredient.cost).toFixed(2)}` : '---'}
                      </span>
                  </div>
              </div>
            </div>
        </div>
      </div>

       {/* Mobile Delete (Bottom) */}
       <div className="md:hidden flex justify-end mt-2 pt-4 border-t border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            className="text-rust hover:bg-rust/5 w-full justify-center"
            onClick={handleDeleteClick}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Ingredient
          </Button>
       </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove ingredient?"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-ink-700">
          Removing this will leave your ingredient list empty. Shall we continue?
        </p>
      </Modal>
    </div>
  );
};