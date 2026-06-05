import { useMemo } from 'react';
import { Target, CheckCircle2, Users, Dumbbell, Flag, LineChart } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Avatar } from '@/components/Avatar';
import { ChartCard } from '@/charts/ChartCard';
import { TodayChart } from '@/charts/TodayChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeam, useParticipants, useParticipantSnapshots } from '@/hooks/useChallengeData';
import { formatNumber, formatPercent, clampPercent } from '@/lib/format';
import {
  challengeProgress,
  dailyCompletionPercent,
  isRestDay,
  participantTargetPercent,
  teamDailyTarget,
  teamTodayCompleted,
} from '@/lib/analytics';

export default function TodaysChallenge() {
  const { data: team } = useTeam();
  const { data: participants = [], isLoading } = useParticipants();
  const { data: snapshots = [] } = useParticipantSnapshots();

  const perTarget = team?.currentDay?.targetPerParticipant ?? 0;
  const teamTarget = team ? teamDailyTarget(team, participants) : 0;
  const completed = teamTodayCompleted(participants);
  const pct = team ? dailyCompletionPercent(team, participants) : 0;
  const remaining = Math.max(0, teamTarget - completed);
  const restDay = team ? isRestDay(team) : false;
  const challenge = team ? challengeProgress(team, participants) : null;

  // The day to chart: the current challenge day, falling back to the most recent
  // snapshot's day so the graph still renders if `currentDay` isn't published.
  const todayKey =
    team?.currentDay?.dayKey ??
    [...snapshots].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0]?.dayKey ??
    null;
  const todaySnapshots = useMemo(
    () => (todayKey ? snapshots.filter((s) => s.dayKey === todayKey) : []),
    [snapshots, todayKey]
  );

  return (
    <div>
      <PageHeader
        title="Today's Challenge"
        description={
          team?.currentDay?.dayNumber
            ? `Day ${team.currentDay.dayNumber} of the challenge`
            : 'Track progress against today’s target'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Target per person"
          value={restDay ? 'Rest' : perTarget > 0 ? formatNumber(perTarget) : '—'}
          icon={Target}
          hint={restDay ? 'rest day' : 'push-ups today'}
        />
        <KpiCard
          label="Completed by team"
          value={formatNumber(completed)}
          icon={CheckCircle2}
          hint={teamTarget > 0 ? `of ${formatNumber(teamTarget)} target` : undefined}
        />
        <KpiCard
          label="Still to go"
          value={formatNumber(remaining)}
          icon={Users}
          hint="push-ups remaining"
        />
        <KpiCard
          label="Total push-ups"
          value={formatNumber(team?.totalPushUps ?? 0)}
          icon={Dumbbell}
          hint="across the challenge"
        />
      </div>

      <ChartCard
        title="Push-ups today"
        description="Each member's push-ups across the day"
        height={320}
      >
        {todaySnapshots.length ? (
          <TodayChart
            participants={participants}
            snapshots={todaySnapshots}
            dayKey={todayKey!}
            target={perTarget}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No push-ups logged yet today.
          </div>
        )}
      </ChartCard>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" /> Team progress today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {restDay ? (
              <p className="text-sm text-muted-foreground">
                No target today — Sundays are rest days. 🛌
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatNumber(completed)} / {formatNumber(teamTarget)} push-ups
                  </span>
                  <span className="font-semibold tabular-nums">{formatPercent(pct)}</span>
                </div>
                <Progress value={clampPercent(pct)} className="h-3" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="size-4 text-primary" /> Challenge progress
            </CardTitle>
            <CardDescription>
              {challenge
                ? `${formatNumber(team!.totalPushUps)} of ${formatNumber(challenge.target)} push-ups for the whole challenge`
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
                <Progress value={clampPercent(challenge.percent)} indicatorClassName="bg-emerald-500" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {formatNumber(team?.totalPushUps ?? 0)} push-ups so far.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="size-4 text-primary" /> Per-member progress
          </CardTitle>
          <CardDescription>How much of today’s target each member has done.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          {!isLoading && participants.length === 0 && (
            <p className="text-sm text-muted-foreground">No participants yet.</p>
          )}
          {!isLoading &&
            [...participants]
              .sort((a, b) => b.todayPushUps - a.todayPushUps)
              .map((p) => {
                const memberPct = participantTargetPercent(p, perTarget);
                return (
                  <div key={p.participantId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={p.name} src={p.avatarUrl} />
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatNumber(p.todayPushUps)}
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
