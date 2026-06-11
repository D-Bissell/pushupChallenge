import { useMemo, useState } from 'react';
import { DollarSign, Target, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Avatar } from '@/components/Avatar';
import {
  DateRangeSelector,
  rangeFromPreset,
  type RangePreset,
} from '@/components/DateRangeSelector';
import { ChartCard } from '@/charts/ChartCard';
import { FundraisingChart } from '@/charts/FundraisingChart';
import { ParticipantProgressChart } from '@/charts/ParticipantProgressChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeam, useParticipants, useChallengeSeries } from '@/hooks/useChallengeData';
import { topBy } from '@/lib/analytics';
import { formatCurrency, formatPercent, clampPercent } from '@/lib/format';
import type { DateRange } from '@/types';

function inRange<T extends { capturedAt: Date }>(items: T[], range?: DateRange): T[] {
  if (!range) return items;
  return items.filter((i) => i.capturedAt >= range.from && i.capturedAt <= range.to);
}

export default function Fundraising() {
  const [preset, setPreset] = useState<RangePreset>('30d');
  const range = useMemo(() => rangeFromPreset(preset), [preset]);

  const { data: team, isLoading } = useTeam();
  const { data: participants = [] } = useParticipants();
  // The whole-challenge series is one cheap doc read; filter the range here.
  const { data: series } = useChallengeSeries();
  const fundraisingSnapshots = useMemo(
    () => inRange(series?.fundraisingSnapshots ?? [], range),
    [series, range]
  );
  const participantSnapshots = useMemo(
    () => inRange(series?.participantSnapshots ?? [], range),
    [series, range]
  );

  const raised = team?.fundraising ?? 0;
  const goal = team?.fundraisingGoal ?? null;
  const goalPct = goal && goal > 0 ? (raised / goal) * 100 : null;
  const topRaisers = topBy(participants, 'fundraising');

  return (
    <div>
      <PageHeader
        title="Fundraising"
        description="How the team's fundraising is growing over time."
        actions={<DateRangeSelector value={preset} onChange={setPreset} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total raised"
          value={formatCurrency(raised)}
          icon={DollarSign}
          loading={isLoading}
          hint="across the team"
        />
        <KpiCard
          label="Goal"
          value={goal ? formatCurrency(goal) : '—'}
          icon={Target}
          loading={isLoading}
          hint={goalPct != null ? `${formatPercent(goalPct)} reached` : 'not published'}
        />
        <KpiCard
          label="Fundraisers"
          value={String(participants.filter((p) => p.fundraising > 0).length)}
          icon={Users}
          loading={isLoading}
          hint="members with donations"
        />
      </div>

      {goalPct != null && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(raised)} of {formatCurrency(goal!)}
              </span>
              <span className="font-semibold tabular-nums">{formatPercent(goalPct)}</span>
            </div>
            <Progress value={clampPercent(goalPct)} indicatorClassName="bg-emerald-500" />
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Total raised over time" description="Cumulative funds raised by the team">
          <FundraisingChart data={fundraisingSnapshots} />
        </ChartCard>

        <ChartCard
          title="By member over time"
          description="Top 5 members' cumulative fundraising"
        >
          <ParticipantProgressChart
            participants={participants}
            snapshots={participantSnapshots}
            metric="fundraising"
          />
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Raised by member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          {!isLoading && topRaisers.length === 0 && (
            <p className="text-sm text-muted-foreground">No fundraising yet.</p>
          )}
          {!isLoading &&
            topRaisers.map((p) => {
              const share = raised > 0 ? (p.fundraising / raised) * 100 : 0;
              return (
                <div key={p.participantId}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={p.name} src={p.avatarUrl} />
                      <span className="truncate text-sm font-medium">{p.name}</span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(p.fundraising)}
                    </span>
                  </div>
                  <Progress value={clampPercent(share)} />
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
