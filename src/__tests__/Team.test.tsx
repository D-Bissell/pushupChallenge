import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Team from '@/pages/Team';

// In tests Firebase is unconfigured, so the data layer serves sample data.
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Team />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Team page', () => {
  it('renders the roster from sample data', async () => {
    renderPage();
    expect(await screen.findByText('Dana Bissell')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Team & Leaderboard' })).toBeInTheDocument();
  });

  it('filters the roster by search', async () => {
    renderPage();
    await screen.findByText('Dana Bissell');
    await userEvent.type(screen.getByLabelText('Search members'), 'Dana');
    expect(screen.getByText('Dana Bissell')).toBeInTheDocument();
    // A different member is filtered out.
    expect(screen.queryByText('Sam Carter')).not.toBeInTheDocument();
  });
});
