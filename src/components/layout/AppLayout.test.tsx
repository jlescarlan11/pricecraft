import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
  })),
}));

describe('AppLayout', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: MemoryRouter });
  };

  it('renders the title and children', () => {
    renderWithRouter(
      <AppLayout>
        <div data-testid="test-child">Test Content</div>
      </AppLayout>
    );

    // The brand appears in both the sidebar and the topbar breadcrumb.
    expect(screen.getAllByText('PriceCraft').length).toBeGreaterThan(0);
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });
});
