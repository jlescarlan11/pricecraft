import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default info variant classes', () => {
    render(<Badge>Info Badge</Badge>);
    const badge = screen.getByText('Info Badge');
    expect(badge).toHaveClass('bg-clay-50');
    expect(badge).toHaveClass('text-clay-700');
  });

  it('applies success variant classes', () => {
    render(<Badge variant="success">Success Badge</Badge>);
    const badge = screen.getByText('Success Badge');
    expect(badge).toHaveClass('bg-moss-50');
    expect(badge).toHaveClass('text-moss-700');
  });

  it('applies warning variant classes', () => {
    render(<Badge variant="warning">Warning Badge</Badge>);
    const badge = screen.getByText('Warning Badge');
    expect(badge).toHaveClass('bg-amber-50');
    expect(badge).toHaveClass('text-amber-700');
  });

  it('applies error variant classes', () => {
    render(<Badge variant="error">Error Badge</Badge>);
    const badge = screen.getByText('Error Badge');
    expect(badge).toHaveClass('bg-rust-50');
    expect(badge).toHaveClass('text-rust-700');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    expect(screen.getByText('Custom Badge')).toHaveClass('custom-class');
  });
});
