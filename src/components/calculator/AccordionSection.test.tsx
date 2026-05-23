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

    // Check for active classes (clay background)
    expect(stepIndicator).toHaveClass('bg-clay');
    expect(stepIndicator).toHaveClass('text-white');
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
    
    // Check for muted green classes - checkmark is inside the indicator div
    expect(checkmark?.parentElement).toHaveClass('bg-moss-50');
    expect(checkmark?.parentElement).toHaveClass('text-moss-700');
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
    
    // Check for default classes
    expect(stepIndicator).toHaveClass('bg-surface');
    expect(stepIndicator).toHaveClass('text-ink-500');
  });
});
