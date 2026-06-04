import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  /** Optional delta, e.g. "+12%". Positive renders green, negative red. */
  delta?: { value: string; positive: boolean };
  loading?: boolean;
}

export function KpiCard({ label, value, icon: Icon, hint, delta, loading }: KpiCardProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <span className="rounded-md bg-primary/10 p-2 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-9 w-28" />
        ) : (
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                delta.positive ? 'text-emerald-500' : 'text-destructive'
              )}
            >
              {delta.positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {delta.value}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
