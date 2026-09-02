import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AccordionSection } from './AccordionSection';

describe('AccordionSection', () => {
  it('renders correctly in active state (isOpen: true)', () => {
    render(
      <AccordionSection
        title="Test Section"
        stepNumber={1}
        isOpen={true}
        isComplete={false}
        onToggle={() => {}}
      >
        <div>Content</div>
      </AccordionSection>
    );

    const stepIndicator = screen.getByText('1');
    expect(stepIndicator).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-controls');
    expect(screen.getByRole('region', { name: /Test Section section/i })).toBeVisible();

    expect(stepIndicator).toHaveClass('bg-ink-900');
    expect(stepIndicator).toHaveClass('text-signal');
  });

  it('renders correctly in completed state (isComplete: true, isOpen: false)', () => {
    const { container } = render(
      <AccordionSection
        title="Test Section"
        stepNumber={1}
        isOpen={false}
        isComplete={true}
        onToggle={() => {}}
      >
        <div>Content</div>
      </AccordionSection>
    );

    // Should show checkmark instead of number
    const checkmark = container.querySelector('svg');
    expect(checkmark).toBeInTheDocument();
    expect(screen.getByRole('region', { hidden: true })).toHaveAttribute('hidden');
    
    expect(checkmark?.parentElement).toHaveClass('bg-surface');
    expect(checkmark?.parentElement).toHaveClass('text-ink-900');
  });

  it('renders correctly in incomplete state (isOpen: false, isComplete: false)', () => {
    render(
      <AccordionSection
        title="Test Section"
        stepNumber={1}
        isOpen={false}
        isComplete={false}
        onToggle={() => {}}
      >
        <div>Content</div>
      </AccordionSection>
    );

    const stepIndicator = screen.getByText('1');
    expect(stepIndicator).toBeInTheDocument();
    expect(screen.getByRole('region', { hidden: true })).toHaveAttribute('hidden');
    
    // Check for default classes
    expect(stepIndicator).toHaveClass('bg-transparent');
    expect(stepIndicator).toHaveClass('text-ink-500');
  });
});
