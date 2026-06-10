import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Target, Dumbbell, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { ChartCard } from '@/charts/ChartCard';
import { TodayChart } from '@/charts/TodayChart';
import { MemberTargetList, type MemberTargetRow } from '@/components/MemberTargetList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useTeam,
  useParticipants,
  useParticipantSnapshots,
} from '@/hooks/useChallengeData';
import { formatNumber } from '@/lib/format';
import {
  teamDailyTarget,
  teamTodayCompleted,
  isRestDay,
  expectedPerParticipantToDate,
  teamPace,
} from '@/lib/analytics';

/**
 * Landing page. Answers the two questions people care about most, in order:
 *   1. How is everyone doing against *today's* target?
 *   2. How is everyone doing against the *running* (expected-to-date) target —
 *      are we ahead or behind right now?
 *
 * Current totals come from the live team/participant docs; only the intra-day
 * chart reads snapshots (bounded to the last two days to spare read quota).
 */
export default function Overview() {
  const { data: team } = useTeam();
  const { data: participants = [], isLoading } = useParticipants();
  // This page only charts *today*, so read a tight window around the current
  // challenge day rather than the whole (ever-growing) snapshot history. Anchor
  // it to the campaign day (with a ±1 day pad for the timezone boundary) so it
  // works regardless of the wall clock.
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
  const restDay = team ? isRestDay(team) : false;
  const teamTarget = team ? teamDailyTarget(team, participants) : 0;
  const completedToday = teamTodayCompleted(participants);
  const todayDelta = completedToday - teamTarget;

  const expectedPer = team ? expectedPerParticipantToDate(team) : null;
  const pace = team ? teamPace(team, participants) : null;

  // The day to chart: the current challenge day, falling back to the latest
  // snapshot's day so the graph still renders if `currentDay` isn't published.
  const todayKey =
    team?.currentDay?.dayKey ??
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
    value: p.totalPushUps,
    target: expectedPer ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Overview"
        description={
          team?.currentDay?.dayNumber
            ? `Day ${team.currentDay.dayNumber} of the challenge`
            : 'Today, and the challenge so far'
        }
      />

      {/* The two "are we on track?" answers, up front. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Done today"
          value={formatNumber(completedToday)}
          icon={Target}
          hint={restDay ? 'rest day' : teamTarget > 0 ? `of ${formatNumber(teamTarget)} target` : undefined}
          delta={
            !restDay && teamTarget > 0
              ? {
                  value:
                    todayDelta >= 0
                      ? `${formatNumber(todayDelta)} ahead`
                      : `${formatNumber(Math.abs(todayDelta))} to go`,
                  positive: todayDelta >= 0,
                }
              : undefined
          }
        />
        <KpiCard
          label="Challenge so far"
          value={formatNumber(team?.totalPushUps ?? 0)}
          icon={TrendingUp}
          hint={pace ? `of ${formatNumber(pace.expected)} expected by now` : 'across the challenge'}
          delta={
            pace
              ? {
                  value:
                    pace.delta >= 0
                      ? `${formatNumber(pace.delta)} ahead`
                      : `${formatNumber(Math.abs(pace.delta))} behind`,
                  positive: pace.delta >= 0,
                }
              : undefined
          }
        />
        <KpiCard
          label="Today's target"
          value={restDay ? 'Rest' : perTarget > 0 ? formatNumber(perTarget) : '—'}
          icon={Dumbbell}
          hint={restDay ? 'Sundays are rest days' : 'push-ups per person'}
        />
        <KpiCard
          label="Participants"
          value={formatNumber(team?.participantCount ?? participants.length)}
          icon={Users}
          hint="on the team"
        />
      </div>

      {/* 1. Today vs today's target. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" /> Today vs target
            </CardTitle>
            <CardDescription>
              {restDay ? 'Rest day — no target today. 🛌' : "How much of today's target each member has done."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MemberTargetList
              rows={todayRows}
              loading={isLoading}
              emptyText="No participants yet."
            />
          </CardContent>
        </Card>
      </div>

      {/* 2. Challenge so far vs the running (expected-to-date) target. */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" /> Challenge vs running target
            </CardTitle>
            <CardDescription>
              Each member's total vs where they should be by today
              {expectedPer != null ? ` (${formatNumber(expectedPer)} per person)` : ''}.
            </CardDescription>
          </div>
          <Link
            to="/challenge"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Full trend <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <MemberTargetList
            rows={challengeRows}
            showDelta
            loading={isLoading}
            emptyText="No participants yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
