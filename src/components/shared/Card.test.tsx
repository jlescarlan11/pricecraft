import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import { describe, it, expect } from 'vitest';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders title correctly', () => {
    render(<Card title="Test Title">Content</Card>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders footer correctly', () => {
    render(<Card footer="Test Footer">Content</Card>);
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('bg-bg-elevated');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('shadow-level-1');
  });

  it('applies interactive classes when interactive prop is true', () => {
    const { container } = render(<Card interactive>Content</Card>);
    expect(container.firstChild).toHaveClass('hover:shadow-level-2');
  });
});
