import { Target, CheckCircle2, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Avatar } from '@/components/Avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTeam, useParticipants } from '@/hooks/useChallengeData';
import { formatNumber, formatPercent, clampPercent } from '@/lib/format';
import {
  dailyCompletionPercent,
  isRestDay,
  participantTargetPercent,
  teamDailyTarget,
  teamTodayCompleted,
} from '@/lib/analytics';

export default function TodaysChallenge() {
  const { data: team } = useTeam();
  const { data: participants = [] } = useParticipants();

  const perTarget = team?.currentDay?.targetPerParticipant ?? 0;
  const teamTarget = team ? teamDailyTarget(team, participants) : 0;
  const completed = teamTodayCompleted(participants);
  const pct = team ? dailyCompletionPercent(team, participants) : 0;
  const remaining = Math.max(0, teamTarget - completed);
  const restDay = team ? isRestDay(team) : false;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team progress today</CardTitle>
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

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-member progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {participants.length === 0 && (
            <p className="text-sm text-muted-foreground">No participants yet.</p>
          )}
          {[...participants]
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
