import { Flame, DollarSign, TrendingUp, Target, Dumbbell, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeam, useParticipants, useChallengeSeries } from '@/hooks/useChallengeData';
import { buildInsights } from '@/lib/analytics';

const ICONS: Record<string, LucideIcon> = {
  'biggest-mover': Flame,
  'fundraising-leader': DollarSign,
  'most-improved': TrendingUp,
  'completion-leader': Target,
  'push-up-leader': Dumbbell,
};

export default function Insights() {
  const { data: team, isLoading: teamLoading } = useTeam();
  const { data: participants = [], isLoading: participantsLoading } = useParticipants();
  const { data: series } = useChallengeSeries();
  const snapshots = series?.participantSnapshots ?? [];

  const loading = teamLoading || participantsLoading;
  const insights = team ? buildInsights(team, participants, snapshots) : [];

  return (
    <div>
      <PageHeader title="Insights" description="Auto-generated highlights from the latest data." />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Insights will appear once data has been collected.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => {
            const Icon = ICONS[insight.key] ?? TrendingUp;
            return (
              <Card key={insight.key} className="animate-fade-in">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                      <Icon className="size-4" />
                    </span>
                    {insight.label}
                  </div>
                  {insight.participant && (
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar
                        name={insight.participant.name}
                        src={insight.participant.avatarUrl}
                        className="size-10"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{insight.participant.name}</p>
                        <p className="text-sm text-primary">{insight.value}</p>
                      </div>
                    </div>
                  )}
                  {!insight.participant && (
                    <p className="mt-4 text-2xl font-semibold">{insight.value}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
