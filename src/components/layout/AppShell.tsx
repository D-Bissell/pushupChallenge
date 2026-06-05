import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Button } from '@/components/ui/button';
import { useTeam, useParticipants } from '@/hooks/useChallengeData';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  // The two core queries every page depends on. If they error (e.g. Firestore
  // unreachable or rules misconfigured), surface a single banner with retry
  // rather than letting pages render silent zeros. (Queries are shared via the
  // React Query cache, so this adds no extra fetches.)
  const team = useTeam();
  const participants = useParticipants();
  const hasError = team.isError || participants.isError;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card px-3 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r bg-card px-3 shadow-xl animate-fade-in">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
            <SyncStatusBadge />
          </div>
          <ThemeToggle />
        </header>

        <main className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8')}>
          {hasError && <ErrorBanner onRetry={() => queryClient.invalidateQueries()} />}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
