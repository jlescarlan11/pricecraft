import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
  onLoadSample,
  initialInput,
  initialConfig,
}: {
  onCalculate?: (
    results: CalculationResult,
    input: CalculationInput,
    config: PricingConfig
  ) => void;
  onLoadSample?: () => void;
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
          if (
            window.confirm(
              'Are you sure you want to clear the form? This will remove all your progress.'
            )
          ) {
            state.reset();
          }
        }}
        onLoadSample={onLoadSample}
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

describe('CalculatorForm', () => {
  const mockOnCalculate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all sub-components', () => {
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    expect(screen.getByText('Product Details')).toBeInTheDocument();
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Labor Cost/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Overhead Cost/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Pricing Strategy/i })).toBeInTheDocument();
  });

  it('updates product name and saves to session storage', async () => {
    vi.useFakeTimers();
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    const input = screen.getByLabelText(/Product Name/i);
    fireEvent.change(input, { target: { value: 'New Product' } });

    expect(input).toHaveValue('New Product');

    // Fast-forward for the auto-save effect
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Check session storage
    const storedStr = window.sessionStorage.getItem('pricing_calculator_draft');
    expect(storedStr).not.toBeNull();
    const stored = JSON.parse(storedStr!);
    expect(stored.input.productName).toBe('New Product');
    vi.useRealTimers();
  });

  it('updates business name and saves to session storage', async () => {
    vi.useFakeTimers();
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    const input = screen.getByLabelText(/Business Name/i);
    fireEvent.change(input, { target: { value: 'My Bakery' } });

    expect(input).toHaveValue('My Bakery');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const storedStr = window.sessionStorage.getItem('pricing_calculator_draft');
    const stored = JSON.parse(storedStr!);
    expect(stored.input.businessName).toBe('My Bakery');
    vi.useRealTimers();
  });

  it('adds and removes ingredients', () => {
    vi.useFakeTimers();
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);

    expect(screen.getAllByLabelText(/Ingredient Name/i)).toHaveLength(2);

    const removeButtons = screen.getAllByTitle(/Remove ingredient/i);
    fireEvent.click(removeButtons[1]);

    act(() => {
      vi.advanceTimersByTime(310);
    });

    expect(screen.getAllByLabelText(/Ingredient Name/i)).toHaveLength(1);
    vi.useRealTimers();
  });

  it('triggers validation on calculate click', async () => {
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    const calculateBtns = screen.getAllByRole('button', { name: /Calculate/i });
    fireEvent.click(calculateBtns[0]);

    expect(await screen.findByText(/Please provide a name for your product/i)).toBeInTheDocument();
    expect(mockOnCalculate).not.toHaveBeenCalled();
  });

  it('performs calculation when form is valid', async () => {
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: 'Valid Product' },
    });
    fireEvent.change(screen.getByLabelText(/Batch Size/i), { target: { value: '10' } });

    const nameInputs = screen.getAllByLabelText(/Ingredient Name/i);
    const qtyInputs = screen.getAllByPlaceholderText('Qty');
    const purchaseCostInputs = screen.getAllByPlaceholderText('Total Cost');

    fireEvent.change(nameInputs[0], { target: { value: 'Flour' } });
    fireEvent.change(qtyInputs[0], { target: { value: '1000' } }); // Purchase Qty
    fireEvent.change(purchaseCostInputs[0], { target: { value: '50' } });
    fireEvent.change(qtyInputs[1], { target: { value: '1000' } }); // Recipe Qty (Usage)

    const calculateBtns = screen.getAllByRole('button', { name: /Calculate/i });
    fireEvent.click(calculateBtns[0]);

    await waitFor(() => {
      expect(mockOnCalculate).toHaveBeenCalledWith(
        expect.objectContaining({
          totalCost: expect.any(Number),
          recommendedPrice: expect.any(Number),
        }),
        expect.objectContaining({
          productName: 'Valid Product',
          batchSize: 10,
        }),
        expect.objectContaining({
          strategy: expect.any(String),
          value: expect.any(Number),
        })
      );
    }, { timeout: 3000 });

    const result = mockOnCalculate.mock.calls[0][0];
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.recommendedPrice).toBeGreaterThan(0);
  });

  it('restores draft from session storage', () => {
    const draft = {
      input: {
        productName: 'Saved Draft',
        batchSize: 24,
        ingredients: [{ 
          id: '1', 
          name: 'Saved Ing', 
          purchaseQuantity: 100,
          purchaseUnit: 'g',
          purchaseCost: 20,
          recipeQuantity: 100,
          recipeUnit: 'g',
          cost: 20 
        }],
        laborCost: 10,
        overhead: 5,
      },
      config: { strategy: 'margin', value: 30 },
    };
    window.sessionStorage.setItem('pricing_calculator_draft', JSON.stringify(draft));

    render(<TestWrapper onCalculate={mockOnCalculate} />);

    expect(screen.getByLabelText(/Product Name/i)).toHaveValue('Saved Draft');
    expect(screen.getByLabelText(/Batch Size/i)).toHaveValue(24);
    expect(screen.getByLabelText(/Ingredient Name/i)).toHaveValue('Saved Ing');
  });

  it('clears form when reset is clicked', () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmSpy);

    render(<TestWrapper onCalculate={mockOnCalculate} />);
    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: 'To Be Cleared' },
    });

    const resetBtns = screen.getAllByRole('button', { name: /^Reset$/ });
    fireEvent.click(resetBtns[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByLabelText(/Product Name/i)).toHaveValue('');
    expect(window.sessionStorage.getItem('pricing_calculator_draft')).toBeNull();

    vi.unstubAllGlobals();
  });

  it('enables continue button when section is valid', () => {
    render(<TestWrapper onCalculate={mockOnCalculate} />);

    // Step 1 (Product Details) Continue button
    const continueButtons = screen.getAllByRole('button', { name: /Continue/i });
    const step1Button = continueButtons[0];

    // Initially disabled (productName empty, batchSize defaults to 0 or empty string if not set, but form requires >= 1)
    // Actually batchSize defaults to 0 in my TestWrapper logic if not provided? 
    // Wait, useCalculatorState defaults?
    // Let's just check it is disabled.
    expect(step1Button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'New Product' } });
    fireEvent.change(screen.getByLabelText(/Batch Size/i), { target: { value: '10' } });

    expect(step1Button).not.toBeDisabled();
  });

  it('populates state when initialInput and initialConfig props are provided', () => {
    const input = {
      productName: 'Initial Product',
      batchSize: 100,
      ingredients: [{ 
        id: 'ext-1', 
        name: 'Ext Ing', 
        purchaseQuantity: 50,
        purchaseUnit: 'g',
        purchaseCost: 10,
        recipeQuantity: 50,
        recipeUnit: 'g',
        cost: 10 
      }],
      laborCost: 100,
      overhead: 50,
    };
    const config = { strategy: 'markup', value: 20 } as const;

    render(
      <TestWrapper onCalculate={mockOnCalculate} initialInput={input} initialConfig={config} />
    );

    expect(screen.getByLabelText(/Product Name/i)).toHaveValue('Initial Product');
    expect(screen.getByLabelText(/Batch Size/i)).toHaveValue(100);
    expect(screen.getByLabelText(/Ingredient Name/i)).toHaveValue('Ext Ing');
  });

  it('handles missing input fields gracefully during rendering', () => {
    const corruptedInput = {
      // Missing productName, ingredients, etc.
    } as unknown as CalculationInput;
    const config = { strategy: 'markup', value: 20 } as unknown as PricingConfig;

    // Should not crash when rendering with partial/invalid data
    render(
      <ToastProvider>
        <CalculatorForm
          input={corruptedInput}
          config={config}
          errors={{}}
          isCalculating={false}
          onUpdateInput={vi.fn()}
          onUpdateIngredient={vi.fn()}
          onAddIngredient={vi.fn()}
          onRemoveIngredient={vi.fn()}
          onUpdateConfig={vi.fn()}
          onCalculate={vi.fn()}
          onReset={vi.fn()}
          onSetHasVariants={vi.fn()}
          onAddVariant={vi.fn()}
          onRemoveVariant={vi.fn()}
          onUpdateVariant={vi.fn()}
          onUpdateVariantIngredient={vi.fn()}
          onAddVariantIngredient={vi.fn()}
          onRemoveVariantIngredient={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByRole('heading', { name: /Build your recipe/i })).toBeInTheDocument();
  });

  it('renders Load Sample Data when form is empty', () => {
    const onLoadSample = vi.fn();
    render(<TestWrapper onLoadSample={onLoadSample} />);

    expect(screen.getByText(/Load Sample Data/i)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(/Load Sample Data/i));
    expect(onLoadSample).toHaveBeenCalled();
  });

  it('hides Load Sample Data when user starts typing', async () => {
    render(<TestWrapper onLoadSample={vi.fn()} />);

    expect(screen.queryByText(/Load Sample Data/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/Product Name/i);
    fireEvent.change(input, { target: { value: 'A' } });

    expect(screen.queryByText(/Load Sample Data/i)).not.toBeInTheDocument();
  });
});
