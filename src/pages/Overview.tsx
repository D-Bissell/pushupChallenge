import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, TrendingUp, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ChartCard } from '@/charts/ChartCard';
import { TodayChart } from '@/charts/TodayChart';
import { MemberTargetList, type MemberTargetRow } from '@/components/MemberTargetList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  useTeam,
  useParticipants,
  useParticipantSnapshots,
} from '@/hooks/useChallengeData';
import { formatNumber, formatPercent, clampPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  teamDailyTarget,
  teamTodayCompleted,
  isRestDay,
  expectedPerParticipantThroughYesterday,
  teamPace,
} from '@/lib/analytics';

/**
 * Landing page, ordered by what matters most (and stacked single-column so the
 * order holds on mobile):
 *   1. Today's target — the first thing you see.
 *   2. Push-ups today (the live intra-day graph).
 *   3. Today vs target (per-member).
 *   4. Challenge vs the running target (per-member) — measured through
 *      *yesterday*, since today is still in progress.
 *
 * Current totals come from the live team/participant docs; only the intra-day
 * chart reads snapshots (a tight window around the current day to spare quota).
 */
export default function Overview() {
  const { data: team } = useTeam();
  const { data: participants = [], isLoading } = useParticipants();

  const dayKey = team?.currentDay?.dayKey;
  const recentRange = useMemo(() => {
    if (dayKey) {
      const start = new Date(`${dayKey}T00:00:00`).getTime();
      return { from: new Date(start - 86_400_000), to: new Date(start + 2 * 86_400_000) };
    }
    return { from: new Date(Date.now() - 2 * 86_400_000), to: new Date() };
  }, [dayKey]);
  const { data: snapshots = [] } = useParticipantSnapshots(recentRange);

  const perTarget = team?.currentDay?.targetPerParticipant ?? 0;
  const dayNumber = team?.currentDay?.dayNumber ?? null;
  const restDay = team ? isRestDay(team) : false;
  const memberCount = team?.participantCount ?? participants.length;

  const teamTarget = team ? teamDailyTarget(team, participants) : 0;
  const completedToday = teamTodayCompleted(participants);
  const teamPct = teamTarget > 0 ? (completedToday / teamTarget) * 100 : 0;

  // Whole-challenge progress is measured against the target *through yesterday*,
  // with today's reps removed from the totals too, so today (still in progress)
  // doesn't read as ahead or behind here — it lives in "Today vs target" above.
  const expectedYesterdayPer = team ? expectedPerParticipantThroughYesterday(team) : null;
  const pace = team ? teamPace(team, participants, { throughYesterday: true }) : null;
  const bankedTotal = Math.max(0, (team?.totalPushUps ?? 0) - completedToday);

  // The day to chart: the current challenge day, falling back to the latest
  // snapshot's day so the graph still renders if `currentDay` isn't published.
  const todayKey =
    dayKey ??
    [...snapshots].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0]?.dayKey ??
    null;
  const todaySnapshots = useMemo(
    () => (todayKey ? snapshots.filter((s) => s.dayKey === todayKey) : []),
    [snapshots, todayKey]
  );

  const todayRows: MemberTargetRow[] = participants.map((p) => ({
    participant: p,
    value: p.todayPushUps,
    target: perTarget,
  }));
  const challengeRows: MemberTargetRow[] = participants.map((p) => ({
    participant: p,
    // Banked at the start of today (today's reps removed) to match the
    // through-yesterday target.
    value: Math.max(0, p.totalPushUps - p.todayPushUps),
    target: expectedYesterdayPer ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Overview"
        description={dayNumber ? `Day ${dayNumber} of the challenge` : 'Today, and the challenge so far'}
      />

      <div className="space-y-4">
        {/* 1. Today's target — the headline. */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's target</p>
              <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
                {restDay ? 'Rest day' : perTarget > 0 ? formatNumber(perTarget) : '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {restDay
                  ? 'Sundays are rest days 🛌'
                  : perTarget > 0
                    ? 'push-ups per person'
                    : 'target not published yet'}
                {dayNumber ? ` · Day ${dayNumber}` : ''}
                {memberCount ? ` · ${memberCount} members` : ''}
              </p>
            </div>
            <span className="rounded-lg bg-primary/10 p-3 text-primary">
              <Target className="size-6" />
            </span>
          </CardContent>
        </Card>

        {/* 2. Push-ups today (live intra-day graph). */}
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

        {/* 3. Today vs target (per-member). */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" /> Today vs target
            </CardTitle>
            <CardDescription>
              {restDay
                ? 'Rest day — no target today. 🛌'
                : "How much of today's target each member has done."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!restDay && teamTarget > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Done today: {formatNumber(completedToday)} / {formatNumber(teamTarget)}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPercent(teamPct)}</span>
                </div>
                <Progress value={clampPercent(teamPct)} className="h-2.5" />
              </div>
            )}
            <MemberTargetList rows={todayRows} loading={isLoading} emptyText="No participants yet." />
          </CardContent>
        </Card>

        {/* 4. Challenge vs the running target (through yesterday). */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" /> Challenge vs running target
              </CardTitle>
              <CardDescription>
                Each member's total at the start of today vs the target through yesterday
                {expectedYesterdayPer != null ? ` (${formatNumber(expectedYesterdayPer)} per person)` : ''}.
                Today's progress is in “Today vs target” above.
              </CardDescription>
            </div>
            <Link
              to="/challenge"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Full trend <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {pace && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Through yesterday: {formatNumber(bankedTotal)}
                </span>
                <span
                  className={cn(
                    'font-medium',
                    pace.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  )}
                >
                  {pace.delta >= 0
                    ? `${formatNumber(pace.delta)} ahead`
                    : `${formatNumber(Math.abs(pace.delta))} behind`}
                </span>
              </div>
            )}
            <MemberTargetList
              rows={challengeRows}
              showDelta
              loading={isLoading}
              emptyText="No participants yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
