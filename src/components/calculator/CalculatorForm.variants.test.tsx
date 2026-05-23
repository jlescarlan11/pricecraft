import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CalculatorForm } from './CalculatorForm';
import { ToastProvider } from '../shared/Toast';
import { useCalculatorState } from '../../hooks/useCalculatorState';
import type { CalculationInput, PricingConfig, CalculationResult } from '../../types/calculator';

// Mock usePresets
vi.mock('../../hooks/use-presets', () => ({
  usePresets: vi.fn(() => ({
    presets: [],
    addPreset: vi.fn(),
    deletePreset: vi.fn(),
  })),
}));

const TestWrapper = ({
  onCalculate,
  initialInput,
  initialConfig,
}: {
  onCalculate?: (
    results: CalculationResult,
    input: CalculationInput,
    config: PricingConfig
  ) => void;
  initialInput?: CalculationInput;
  initialConfig?: PricingConfig;
}) => {
  const state = useCalculatorState({ input: initialInput, config: initialConfig });
  return (
    <ToastProvider>
      <CalculatorForm
        {...state}
        onUpdateInput={state.updateInput}
        onUpdateIngredient={state.updateIngredient}
        onAddIngredient={state.addIngredient}
        onRemoveIngredient={state.removeIngredient}
        onUpdateConfig={state.updateConfig}
        onCalculate={async () => {
          const res = await state.calculate();
          if (res && onCalculate) onCalculate(res, state.input, state.config);
        }}
        onReset={() => {
          state.reset();
        }}
        onSetHasVariants={state.setHasVariants}
        onAddVariant={state.addVariant}
        onRemoveVariant={state.removeVariant}
        onUpdateVariant={state.updateVariant}
        onUpdateVariantIngredient={state.updateVariantIngredient}
        onAddVariantIngredient={state.addVariantIngredient}
        onRemoveVariantIngredient={state.removeVariantIngredient}
      />
    </ToastProvider>
  );
};

describe('CalculatorForm Variants', () => {
  const mockOnCalculate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggles variant mode UI', () => {
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    // Initially OFF
    const toggle = screen.getByLabelText(/Variants/i);
    expect(toggle).not.toBeChecked();

    // Check Single Mode UI exists (Pricing Strategy section)
    const strategies = screen.getAllByText(/Pricing Strategy/i);
    expect(strategies.length).toBeGreaterThan(0);

    // Toggle ON
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    // Check Variant UI appears
    expect(screen.getByText(/Base Product/i)).toBeInTheDocument();
    expect(screen.getByText(/Remaining Base Batch/i)).toBeInTheDocument();

    // Single Mode UI (Base Pricing Strategy) should STILL be visible
    // Note: When variant is added, it also has a Pricing Strategy, so we might have multiple.
    // Base one is always there.
    expect(screen.getAllByText(/Pricing Strategy/i).length).toBeGreaterThan(0);
  });

  it('adds a variant and updates capacity', async () => {
    const input: CalculationInput = {
      productName: 'Test Base',
      batchSize: 10,
      ingredients: [{ id: '1', name: 'Flour', amount: 1000, cost: 50 }],
      laborCost: 0,
      overhead: 0,
      hasVariants: true, // Start with variants enabled
      variants: [],
    };

    render(<TestWrapper initialInput={input} />);

    // Verify initial remaining batch
    expect(screen.getByText('10')).toBeInTheDocument(); // 10 units remaining

    // Add Variant
    const addBtn = screen.getByText(/Add Variant/i);
    fireEvent.click(addBtn);

    // New variant should take up all remaining space (10)
    // Wait for update
    const variantNameInput = await screen.findByDisplayValue('Variant 1');
    expect(variantNameInput).toBeInTheDocument();

    // Remaining should now be 0
    expect(screen.getByText('0')).toBeInTheDocument();

    // Button should be disabled / text changed
    expect(screen.getByText(/No Batch Capacity Remaining/i)).toBeInTheDocument();

    // Reduce variant batch size to 6
    // Find the variant card to scope search
    const variantCard = variantNameInput.closest('.shadow-level-1');
    expect(variantCard).not.toBeNull();

    // Find input with value 10 inside this card
    const batchInput = within(variantCard as HTMLElement).getByLabelText(/Batch Allocation/i);
    fireEvent.change(batchInput, { target: { value: '6' } });

    // Remaining should be 4
    expect(screen.getByText('4')).toBeInTheDocument();

    // Button enabled again
    expect(screen.getByRole('button', { name: 'Add Variant' })).toBeInTheDocument();
  });

  it('removes a variant and restores capacity', async () => {
    const input: CalculationInput = {
      productName: 'Test Base',
      batchSize: 10,
      ingredients: [],
      laborCost: 0,
      overhead: 0,
      hasVariants: true,
      variants: [
        {
          id: 'v1',
          name: 'Variant A',
          batchSize: 5,
          ingredients: [],
          laborCost: 0,
          overhead: 0,
          pricingConfig: { strategy: 'markup' as const, value: 50 },
        },
      ],
    };

    render(<TestWrapper initialInput={input} />);

    expect(screen.getByText('5')).toBeInTheDocument(); // Remaining

    const removeBtn = screen.getByLabelText('Remove Variant');
    fireEvent.click(removeBtn);

    // Restores full capacity
    expect(await screen.findByText('10')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Variant A')).not.toBeInTheDocument();
  });

  it('updates variant current price', async () => {
    const input: CalculationInput = {
      productName: 'Test Base',
      batchSize: 10,
      ingredients: [{ id: '1', name: 'Flour', amount: 1000, cost: 50 }],
      laborCost: 0,
      overhead: 0,
      hasVariants: true,
      variants: [
        {
          id: 'v1',
          name: 'Variant A',
          batchSize: 5,
          ingredients: [],
          laborCost: 0,
          overhead: 0,
          pricingConfig: { strategy: 'markup' as const, value: 50 },
        },
      ],
    };

    render(<TestWrapper initialInput={input} />);

    // Find the variant block
    const variantBlock = screen.getByDisplayValue('Variant A').closest('.shadow-level-1');
    expect(variantBlock).not.toBeNull();
    const withinVariant = within(variantBlock as HTMLElement);

    // Click "Compare" to show the input
    const compareBtn = withinVariant.getByRole('button', { name: /Compare/i });
    fireEvent.click(compareBtn);

    // Find Current Price input inside variant block using testId
    const priceSection = withinVariant.getByTestId('current-price-section');
    const priceInput = within(priceSection).getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '25.00' } });

    expect(priceInput).toHaveValue(25);
  });

  it('displays calculated recommended price in variant block', async () => {
    // Setup with valid ingredients so cost > 0
    const input: CalculationInput = {
      productName: 'Test Base',
      batchSize: 10,
      ingredients: [{ id: '1', name: 'Base Ing', amount: 10, cost: 100 }], // Base cost = 10/unit
      laborCost: 0,
      overhead: 0,
      hasVariants: true,
      variants: [
        {
          id: 'v1',
          name: 'Variant A',
          batchSize: 5,
          ingredients: [{ id: '2', name: 'Var Ing', amount: 5, cost: 50 }], // Var specific cost = 50 total / 5 units = 10/unit
          laborCost: 0,
          overhead: 0,
          pricingConfig: { strategy: 'markup' as const, value: 50 }, // Markup 50%
        },
      ],
    };
    // Expected:
    // Base Unit Cost = 100 / 10 = 10
    // Variant Unit Cost = Base(10) + VarSpecific(10) = 20
    // Markup 50% on 20 = 30

    render(<TestWrapper initialInput={input} />);

    // Find the variant block
    const variantBlock = screen.getByDisplayValue('Variant A').closest('.shadow-level-1');
    expect(variantBlock).not.toBeNull();

    const withinVariant = within(variantBlock as HTMLElement);

    // Check for Recommended Price label (which is hidden if cost <= 0)
    expect(withinVariant.getByText(/Recommended Price/i)).toBeInTheDocument();

    // Check for the value 30.00
    // Note: formatCurrency usually adds symbol, assume standard formatting or check partial
    // We look for text that contains "30.00"
    expect(withinVariant.getByText(/30.00/)).toBeInTheDocument();
  });

  it('updates variant limits when base batch size decreases', () => {
    const input: CalculationInput = {
      productName: 'Test Base',
      batchSize: 10,
      ingredients: [{ id: '1', name: 'Flour', amount: 1000, cost: 50 }],
      laborCost: 0,
      overhead: 0,
      hasVariants: true,
      variants: [
        {
          id: 'v1',
          name: 'Variant A',
          batchSize: 10,
          ingredients: [],
          laborCost: 0,
          overhead: 0,
          pricingConfig: { strategy: 'markup' as const, value: 50 },
        },
      ],
    };

    render(<TestWrapper initialInput={input} />);

    const v1BatchInput = screen.getByLabelText(/Batch Allocation/i);
    expect(v1BatchInput).toHaveValue(10);

    // 2. Decrease Base Batch Size to 5
    const baseBatchInput = screen.getByLabelText(/Batch Size/i);
    fireEvent.change(baseBatchInput, { target: { value: '5' } });

    // 3. Check V1 limits (should be Max: 5 now)
    expect(screen.getByText(/Batch Allocation \(Max: 5\)/i)).toBeInTheDocument();

    // 4. Touching V1 batch size should clamp it to 5
    // We use a value different from current (10) to ensure onChange fires
    fireEvent.change(v1BatchInput, { target: { value: '6' } });
    expect(v1BatchInput).toHaveValue(5);
  });
});
