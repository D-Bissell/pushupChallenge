import { Target, CheckCircle2, Users, Flag, LineChart } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Avatar } from '@/components/Avatar';
import { ChartCard } from '@/charts/ChartCard';
import { ChallengeChart } from '@/charts/ChallengeChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeam, useParticipants, useParticipantSnapshots } from '@/hooks/useChallengeData';
import { formatNumber, formatPercent, clampPercent } from '@/lib/format';
import { challengeProgress } from '@/lib/analytics';

export default function Challenge() {
  const { data: team } = useTeam();
  const { data: participants = [], isLoading } = useParticipants();
  const { data: snapshots = [] } = useParticipantSnapshots();

  const perTarget = team?.challengeTargetPerParticipant ?? 0;
  const challenge = team ? challengeProgress(team, participants) : null;
  const total = team?.totalPushUps ?? 0;
  const target = challenge?.target ?? 0;
  const remaining = Math.max(0, target - total);

  return (
    <div>
      <PageHeader
        title="The Challenge"
        description={
          team?.currentDay?.dayNumber
            ? `Where the team is across the whole challenge — day ${team.currentDay.dayNumber} so far`
            : 'Where the team is across the whole challenge'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Target per person"
          value={perTarget > 0 ? formatNumber(perTarget) : '—'}
          icon={Target}
          hint="for the challenge"
        />
        <KpiCard
          label="Completed by team"
          value={formatNumber(total)}
          icon={CheckCircle2}
          hint={target > 0 ? `of ${formatNumber(target)} target` : undefined}
        />
        <KpiCard
          label="Still to go"
          value={formatNumber(remaining)}
          icon={Flag}
          hint="push-ups remaining"
        />
        <KpiCard
          label="Participants"
          value={formatNumber(team?.participantCount ?? participants.length)}
          icon={Users}
          hint="active members"
        />
      </div>

      <ChartCard
        title="Push-ups over the challenge"
        description="Each member's cumulative push-ups vs the expected pace, from day 1"
        height={320}
      >
        {participants.length ? (
          <ChallengeChart
            participants={participants}
            snapshots={snapshots}
            currentDayKey={team?.currentDay?.dayKey}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No push-ups logged yet.
          </div>
        )}
      </ChartCard>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="size-4 text-primary" /> Challenge progress
          </CardTitle>
          <CardDescription>
            {challenge
              ? `${formatNumber(total)} of ${formatNumber(challenge.target)} push-ups for the whole challenge`
              : 'Tracking total push-ups across the challenge'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {challenge ? (
            <>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold tabular-nums">
                  {formatPercent(challenge.percent)}
                </span>
              </div>
              <Progress
                value={clampPercent(challenge.percent)}
                indicatorClassName="bg-emerald-500"
                className="h-3"
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {formatNumber(total)} push-ups so far.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="size-4 text-primary" /> Per-member progress
          </CardTitle>
          <CardDescription>How much of the challenge target each member has done.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          {!isLoading && participants.length === 0 && (
            <p className="text-sm text-muted-foreground">No participants yet.</p>
          )}
          {!isLoading &&
            [...participants]
              .sort((a, b) => b.totalPushUps - a.totalPushUps)
              .map((p) => {
                const memberPct = perTarget > 0 ? (p.totalPushUps / perTarget) * 100 : 0;
                return (
                  <div key={p.participantId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={p.name} src={p.avatarUrl} />
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatNumber(p.totalPushUps)}
                        {perTarget > 0 && ` · ${formatPercent(memberPct)}`}
                      </span>
                    </div>
                    <Progress
                      value={clampPercent(memberPct)}
                      indicatorClassName={memberPct >= 100 ? 'bg-emerald-500' : undefined}
                    />
                  </div>
                );
              })}
        </CardContent>
      </Card>
    </div>
  );
}
