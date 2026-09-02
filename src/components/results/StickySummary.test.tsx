import { render, screen, fireEvent } from '@testing-library/react';
import { StickySummary } from './StickySummary';
import { vi, describe, it, expect } from 'vitest';
import type { CalculationResult } from '../../types/calculator';

describe('StickySummary', () => {
  const defaultProps = {
    results: null,
    hasCommittedResults: false,
    isStale: false,
    onScrollToResults: vi.fn(),
    onCalculate: vi.fn(),
    isCalculating: false,
    isVisible: true,
  };

  const mockSingleResult: CalculationResult = {
    totalCost: 100,
    costPerUnit: 10,
    recommendedPrice: 20,
    breakEvenPrice: 10,
    profitPerBatch: 100,
    profitPerUnit: 10,
    profitMarginPercent: 50,
    breakdown: { ingredients: 50, labor: 30, overhead: 20 },
  };

  const mockVariantResult: CalculationResult = {
    ...mockSingleResult,
    variantResults: [
      {
        id: 'v1',
        name: 'Variant 1',
        totalCost: 5,
        costPerUnit: 5,
        recommendedPrice: 15,
        profitPerUnit: 10,
        profitMarginPercent: 66,
        breakEvenPrice: 5,
      },
      {
        id: 'base',
        name: 'Cookie (Base)',
        totalCost: 4,
        costPerUnit: 4,
        recommendedPrice: 10,
        profitPerUnit: 6,
        profitMarginPercent: 60,
        breakEvenPrice: 4,
      },
    ],
  };

  it('renders placeholder when no results', () => {
    render(<StickySummary {...defaultProps} />);
    expect(screen.getByText('Price runway')).toBeInTheDocument();
    expect(screen.getByText('Ready to calculate')).toBeInTheDocument();
    expect(screen.getByText('Calculate')).toBeInTheDocument();
  });

  it('renders single result stats', () => {
    render(<StickySummary {...defaultProps} results={mockSingleResult} hasCommittedResults={true} />);
    expect(screen.getByText('Cost / unit')).toBeInTheDocument();
    expect(screen.getByText('Sugg. Price')).toBeInTheDocument();
    expect(screen.getByText('₱10.00')).toBeInTheDocument(); // Cost per unit
    expect(screen.getByText('₱20.00')).toBeInTheDocument(); // Price
  });

  it('renders variant results list', () => {
    render(<StickySummary {...defaultProps} results={mockVariantResult} hasCommittedResults={true} />);
    expect(screen.getByText('Variant 1')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument(); // Mapped name
    expect(screen.getByText('₱15.00')).toBeInTheDocument();
  });

  it('calls onCalculate when button clicked', () => {
    render(<StickySummary {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /calculate/i }));
    expect(defaultProps.onCalculate).toHaveBeenCalled();
  });

  it('shows stale state styling', () => {
    render(<StickySummary {...defaultProps} results={mockSingleResult} isStale={true} />);
    expect(screen.getByText('Est. Price')).toBeInTheDocument();
  });
});
