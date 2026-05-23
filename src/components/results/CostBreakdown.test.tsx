import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CostBreakdown } from './CostBreakdown';
import type { CalculationResult } from '../../types/calculator';

const mockResults: CalculationResult = {
  totalCost: 1000,
  costPerUnit: 50,
  breakdown: {
    ingredients: 700,
    labor: 200,
    overhead: 100,
  },
  breakEvenPrice: 50,
  recommendedPrice: 75,
  profitPerBatch: 500,
  profitPerUnit: 25,
  profitMarginPercent: 33.33,
};

describe('CostBreakdown', () => {
  it('renders total batch cost and cost per unit correctly', () => {
    render(<CostBreakdown results={mockResults} />);
    expect(screen.getByText('₱1,000.00')).toBeDefined();
    expect(screen.getByText('₱50.00')).toBeDefined();
  });

  it('renders breakdown categories with correct values', () => {
    render(<CostBreakdown results={mockResults} />);

    expect(screen.getByText('Ingredients')).toBeDefined();

    expect(screen.getByText('₱700.00')).toBeDefined();

    expect(screen.getByText('Labor')).toBeDefined();

    expect(screen.getByText('₱200.00')).toBeDefined();

    expect(screen.getByText('Overhead')).toBeDefined();

    expect(screen.getByText('₱100.00')).toBeDefined();
  });

  it('handles zero total cost gracefully', () => {
    const zeroResults: CalculationResult = {
      ...mockResults,

      totalCost: 0,

      costPerUnit: 0,

      breakdown: {
        ingredients: 0,

        labor: 0,

        overhead: 0,
      },
    };

    render(<CostBreakdown results={zeroResults} />);

    expect(screen.getAllByText('₱0.00').length).toBeGreaterThan(0);
  });

  it('renders detailed variant breakdown when variants exist', () => {
    const variantResultsMock: CalculationResult = {
      ...mockResults,
      profitPerBatch: 2000,
      variantResults: [
        {
          id: 'v1',
          name: 'Variant A',
          totalCost: 100,
          costPerUnit: 10,
          recommendedPrice: 20,
          profitPerUnit: 10,
          profitMarginPercent: 50,
          breakEvenPrice: 10,
          breakdown: {
            baseAllocation: 50,
            specificIngredients: 30,
            specificLabor: 10,
            specificOverhead: 10,
          },
        },
        {
          id: 'v2',
          name: 'Variant B',
          totalCost: 200,
          costPerUnit: 20,
          recommendedPrice: 40,
          profitPerUnit: 20,
          profitMarginPercent: 50,
          breakEvenPrice: 20,
          breakdown: {
            baseAllocation: 50,
            specificIngredients: 130,
            specificLabor: 10,
            specificOverhead: 10,
          },
        },
      ],
    } as unknown as CalculationResult;

    render(<CostBreakdown results={variantResultsMock} />);

    expect(screen.getByText(/Batch summary/i)).toBeDefined();
    expect(screen.getByText(/Cost per variant/i)).toBeDefined();
    expect(screen.getByText('Variant A')).toBeDefined();
    expect(screen.getByText('Variant B')).toBeDefined();
    // Check for specific cost values
    expect(screen.getByText('₱100.00')).toBeDefined(); // Total V1
    expect(screen.getByText('₱200.00')).toBeDefined(); // Total V2
    // expect(screen.getByText('₱30.00')).toBeDefined(); // V1 Specific Ing - This is hidden in tooltip or aggregated
    expect(screen.getAllByText('₱50.00').length).toBeGreaterThan(0); // V1 Total Addons (30+10+10) + Base Allocations
    expect(screen.getByTitle(/Ing: ₱30.00/)).toBeDefined(); // Tooltip check
  });
});
