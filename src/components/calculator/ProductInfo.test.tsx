import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductInfo } from './ProductInfo';

describe('ProductInfo', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    productName: '',
    batchSize: 0,
    onChange: mockOnChange,
    errors: {},
  };

  it('renders product name and batch size inputs', () => {
    render(<ProductInfo {...defaultProps} />);
    expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Batch Size/i)).toBeInTheDocument();
  });

  it('calls onChange when product name is updated', () => {
    render(<ProductInfo {...defaultProps} />);
    const input = screen.getByLabelText(/Product Name/i);
    fireEvent.change(input, { target: { value: 'New Product' } });
    expect(mockOnChange).toHaveBeenCalledWith('productName', 'New Product');
  });

  it('calls onChange when batch size is updated', () => {
    render(<ProductInfo {...defaultProps} />);
    const input = screen.getByLabelText(/Batch Size/i);
    fireEvent.change(input, { target: { value: '10' } });
    expect(mockOnChange).toHaveBeenCalledWith('batchSize', 10);
  });

  it('displays error messages when provided', () => {
    const errors = {
      productName: 'Name is required',
      batchSize: 'Must be positive',
    };
    render(<ProductInfo {...defaultProps} errors={errors} />);
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Must be positive')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<ProductInfo {...defaultProps} />);
    expect(screen.getByText(/Appears on printed pricing sheets/i)).toBeInTheDocument();
  });
});
