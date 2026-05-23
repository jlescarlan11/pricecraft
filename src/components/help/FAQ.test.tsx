import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FAQ } from './FAQ';

// Helpers — the same question text appears in both the TOC sidebar and the
// expandable list, so we scope queries by role/region.

const QUESTION_PROFIT = /What’s a good profit margin for food products\?/i;
const QUESTION_MARKUP = /What’s the difference between markup and margin\?/i;

const getExpandButton = (text: RegExp) => {
  // The expandable buttons have aria-expanded; the TOC buttons don't.
  const buttons = screen.getAllByRole('button', { name: text });
  return buttons.find((b) => b.hasAttribute('aria-expanded'))!;
};

describe('FAQ', () => {
  it('renders the questions index and questions list', () => {
    render(<FAQ />);

    expect(screen.getByText(/^Questions$/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: QUESTION_PROFIT }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: QUESTION_MARKUP }).length).toBeGreaterThanOrEqual(1);
  });

  it('expands and collapses an item when clicked', () => {
    render(<FAQ />);

    const button = getExpandButton(QUESTION_PROFIT);
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText(/Aim for a profit margin of 30% or more to stay healthy/i)
    ).toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters questions based on search input', () => {
    render(<FAQ />);

    const searchInput = screen.getByPlaceholderText(/Search questions or keywords/i);
    fireEvent.change(searchInput, { target: { value: 'markup' } });

    // Find the questions list (the .card that contains the expandable items).
    // The expandable buttons all have aria-expanded set, so we can query for
    // those specifically.
    const expandableButtons = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-expanded'));
    const buttonTexts = expandableButtons.map((b) => b.textContent || '');
    expect(buttonTexts.some((t) => /markup/i.test(t))).toBe(true);
    expect(buttonTexts.some((t) => /good profit margin/i.test(t))).toBe(false);
  });

  it('shows "no match" message when search has no results', () => {
    render(<FAQ />);

    const searchInput = screen.getByPlaceholderText(/Search questions or keywords/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent keyword' } });

    expect(screen.getByText(/No match for/i)).toBeInTheDocument();
  });

  it('only one item is expanded at a time', () => {
    render(<FAQ />);

    const profitBtn = getExpandButton(QUESTION_PROFIT);
    const markupBtn = getExpandButton(QUESTION_MARKUP);

    fireEvent.click(profitBtn);
    expect(profitBtn).toHaveAttribute('aria-expanded', 'true');
    expect(markupBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(markupBtn);
    expect(profitBtn).toHaveAttribute('aria-expanded', 'false');
    expect(markupBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('within() example for scoping — sanity check', () => {
    // Mostly to document the pattern: scoping by region when needed.
    const { container } = render(<FAQ />);
    expect(within(container).getAllByText(QUESTION_PROFIT).length).toBeGreaterThanOrEqual(1);
  });
});
