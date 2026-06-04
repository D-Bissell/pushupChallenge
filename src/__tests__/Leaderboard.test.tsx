import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Leaderboard from '@/pages/Leaderboard';

// In tests Firebase is unconfigured, so the data layer serves sample data.
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Leaderboard page', () => {
  it('renders the top members from sample data', async () => {
    renderPage();
    // Top push-up leader from the fixture.
    expect(await screen.findByText('Dana Bissell')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('switches between push-ups and fundraising metrics', async () => {
    renderPage();
    await screen.findByText('Dana Bissell');
    await userEvent.click(screen.getByRole('tab', { name: 'Fundraising' }));
    // Still renders a populated table after switching.
    expect(screen.getAllByText('Dana Bissell').length).toBeGreaterThan(0);
  });
});
