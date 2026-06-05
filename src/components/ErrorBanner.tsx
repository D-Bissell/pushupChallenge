import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

/** Inline banner shown when live data can't be loaded. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Couldn’t load live data</p>
        <p className="text-destructive/80">
          {message ?? 'There was a problem reaching the database. Showing the last data we have.'}
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0 gap-1.5">
          <RefreshCw className="size-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}
