import { Avatar } from '@/components/Avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatPercent, clampPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Participant } from '@/types';

export interface MemberTargetRow {
  participant: Participant;
  /** What the member has done (today's push-ups, or challenge total). */
  value: number;
  /** What they should have done (today's target, or expected-to-date). */
  target: number;
}

interface Props {
  rows: MemberTargetRow[];
  /** Show an "ahead / behind" delta chip against the target. */
  showDelta?: boolean;
  loading?: boolean;
  emptyText?: string;
}

/**
 * A ranked list of members with a progress bar against a per-member target.
 * Reused for both "today vs today's target" and "challenge vs running target",
 * since the only difference is which value/target pair is passed in.
 */
export function MemberTargetList({ rows, showDelta, loading, emptyText }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">{emptyText ?? 'No members yet.'}</p>;
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {sorted.map(({ participant: p, value, target }) => {
        const pct = target > 0 ? (value / target) * 100 : 0;
        const delta = value - target;
        const done = target > 0 && pct >= 100;
        return (
          <div key={p.participantId}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={p.name} src={p.avatarUrl} />
                <span className="truncate text-sm font-medium">{p.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
                {showDelta && target > 0 && (
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-medium',
                      delta >= 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/15 text-destructive'
                    )}
                  >
                    {delta >= 0
                      ? `+${formatNumber(delta)} ahead`
                      : `${formatNumber(Math.abs(delta))} behind`}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {formatNumber(value)}
                  {target > 0 && ` · ${formatPercent(pct)}`}
                </span>
              </div>
            </div>
            <Progress
              value={clampPercent(pct)}
              indicatorClassName={done ? 'bg-emerald-500' : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
