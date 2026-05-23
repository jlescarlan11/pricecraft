import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OverheadCost } from './OverheadCost';

describe('OverheadCost', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial value', () => {
    render(<OverheadCost value={150} batchSize={10} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/Total Overhead Cost/i)).toHaveValue(150);
  });

  it('calls onChange when input changes', () => {
    render(<OverheadCost value={0} batchSize={10} onChange={mockOnChange} />);
    const input = screen.getByLabelText(/Total Overhead Cost/i);
    fireEvent.change(input, { target: { value: '250' } });
    expect(mockOnChange).toHaveBeenCalledWith(250);
  });

  it('shows warning when value is zero', () => {
    render(<OverheadCost value={0} batchSize={10} onChange={mockOnChange} />);
    expect(screen.getByText(/Zero overhead\? Rare but possible/i)).toBeInTheDocument();
  });

  it('toggles helper section', () => {
    render(<OverheadCost value={0} batchSize={10} onChange={mockOnChange} />);

    expect(screen.queryByText(/Overhead includes all indirect costs/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByLabelText(/Overhead guide/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/Overhead includes all indirect costs/i)).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Close modal/i);
    fireEvent.click(closeBtn);
  });

  it('toggles calculator modal', async () => {
    render(<OverheadCost value={0} batchSize={10} onChange={mockOnChange} />);

    expect(screen.queryByLabelText(/Monthly Rent/i)).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Calculator/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('spinbutton', { name: /Monthly Rent/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Monthly Utilities/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Batches per Month/i })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Close modal/i);
    fireEvent.click(closeBtn);

    // Wait for animation to finish and component to unmount
    await waitFor(() => {
      expect(screen.queryByRole('spinbutton', { name: /Monthly Rent/i })).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('calculates total overhead correctly in calculator', () => {
    render(<OverheadCost value={0} batchSize={50} onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Calculator/i }));

    // Use spinbutton role to target inputs specifically
    fireEvent.change(screen.getByRole('spinbutton', { name: /Monthly Rent/i }), {
      target: { value: '10000' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Batches per Month/i }), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Monthly Utilities/i }), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Packaging per Unit/i }), {
      target: { value: '5' },
    });

    // Total = 500 + 100 + 250 = 850
    // Use a flexible matcher for the currency formatted string
    expect(screen.getByText(/850\.00/)).toBeInTheDocument();
  });

  it('applies calculated value to overhead', () => {
    render(<OverheadCost value={0} batchSize={10} onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Calculator/i }));

    fireEvent.change(screen.getByRole('spinbutton', { name: /Monthly Rent/i }), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Batches per Month/i }), {
      target: { value: '1' },
    });

    // Target the specific Apply button in the calculator
    const applyBtn = screen.getByRole('button', { name: /Apply to Overhead Cost/i });
    fireEvent.click(applyBtn);

    expect(mockOnChange).toHaveBeenCalledWith(200);
  });
});
