import { Dumbbell, DollarSign, Trophy, Users, Clock, Target } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTeam, useParticipants } from '@/hooks/useChallengeData';
import { formatCurrency, formatNumber, formatPercent, timeAgo, clampPercent } from '@/lib/format';
import {
  dailyCompletionPercent,
  isRestDay,
  teamDailyTarget,
  teamTodayCompleted,
} from '@/lib/analytics';

export default function Dashboard() {
  const { data: team, isLoading } = useTeam();
  const { data: participants = [] } = useParticipants();

  const dailyTarget = team ? teamDailyTarget(team, participants) : 0;
  const todayDone = teamTodayCompleted(participants);
  const dailyPct = team ? dailyCompletionPercent(team, participants) : 0;
  const restDay = team ? isRestDay(team) : false;
  const goalPct =
    team && team.fundraisingGoal ? (team.fundraising / team.fundraisingGoal) * 100 : null;

  return (
    <div>
      <PageHeader
        title={team?.name ?? 'Team Dashboard'}
        description="Everything that matters about your team, at a glance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total push-ups"
          value={formatNumber(team?.totalPushUps ?? 0)}
          icon={Dumbbell}
          loading={isLoading}
          hint="across the challenge"
        />
        <KpiCard
          label="Funds raised"
          value={formatCurrency(team?.fundraising ?? 0)}
          icon={DollarSign}
          loading={isLoading}
          hint={team?.fundraisingGoal ? `goal ${formatCurrency(team.fundraisingGoal)}` : undefined}
        />
        <KpiCard
          label="Team rank"
          value={team?.rank ? `#${team.rank}` : '—'}
          icon={Trophy}
          loading={isLoading}
          hint={team?.rank ? 'overall' : 'not published'}
        />
        <KpiCard
          label="Participants"
          value={formatNumber(team?.participantCount ?? participants.length)}
          icon={Users}
          loading={isLoading}
          hint="active members"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" /> Today&apos;s progress
            </CardTitle>
            <CardDescription>
              {restDay
                ? 'Rest day — no target today'
                : dailyTarget > 0
                  ? `${formatNumber(todayDone)} of ${formatNumber(dailyTarget)} push-ups today`
                  : 'Daily target not yet published'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {restDay ? (
              <p className="text-sm text-muted-foreground">
                Sundays are rest days — recover and come back stronger tomorrow. 🛌
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-semibold tabular-nums">{formatPercent(dailyPct)}</span>
                </div>
                <Progress value={clampPercent(dailyPct)} />
                {team?.currentDay?.dayNumber && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Day {team.currentDay.dayNumber} · target {team.currentDay.targetPerParticipant}{' '}
                    push-ups per person
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-4 text-primary" /> Fundraising goal
            </CardTitle>
            <CardDescription>
              {goalPct !== null
                ? `${formatCurrency(team!.fundraising)} raised of ${formatCurrency(team!.fundraisingGoal!)}`
                : 'No fundraising goal set'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {goalPct !== null ? (
              <>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold tabular-nums">{formatPercent(goalPct)}</span>
                </div>
                <Progress value={clampPercent(goalPct)} indicatorClassName="bg-emerald-500" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(team?.fundraising ?? 0)} raised so far.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" /> Last updated {timeAgo(team?.updatedAt ?? null)}
      </p>
    </div>
  );
}
