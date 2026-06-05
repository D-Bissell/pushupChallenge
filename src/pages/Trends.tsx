import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  DateRangeSelector,
  rangeFromPreset,
  type RangePreset,
} from '@/components/DateRangeSelector';
import { ChartCard } from '@/charts/ChartCard';
import { TeamTotalChart } from '@/charts/TeamTotalChart';
import { ParticipantProgressChart } from '@/charts/ParticipantProgressChart';
import { DailyCompletionChart, toDailyCompletion } from '@/charts/DailyCompletionChart';
import {
  useTeam,
  useParticipants,
  useTeamSnapshots,
  useParticipantSnapshots,
} from '@/hooks/useChallengeData';

export default function Trends() {
  const [preset, setPreset] = useState<RangePreset>('14d');
  const range = useMemo(() => rangeFromPreset(preset), [preset]);

  const { data: team } = useTeam();
  const { data: participants = [] } = useParticipants();
  const { data: teamSnapshots = [] } = useTeamSnapshots(range);
  const { data: participantSnapshots = [] } = useParticipantSnapshots(range);

  const dailyCompletion = useMemo(
    () =>
      toDailyCompletion(
        teamSnapshots,
        participantSnapshots,
        team?.currentDay?.targetPerParticipant ?? 0
      ),
    [teamSnapshots, participantSnapshots, team]
  );

  return (
    <div>
      <PageHeader
        title="Trends"
        description="How the team is tracking over time."
        actions={<DateRangeSelector value={preset} onChange={setPreset} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Team push-ups over time" description="Cumulative total across the team">
          <TeamTotalChart data={teamSnapshots} />
        </ChartCard>

        <ChartCard title="Participant progress" description="Top 5 members' cumulative push-ups">
          <ParticipantProgressChart participants={participants} snapshots={participantSnapshots} />
        </ChartCard>

        <ChartCard
          title="Daily completion %"
          description="Share of each day's target reached"
          height={280}
        >
          {dailyCompletion.length ? (
            <DailyCompletionChart data={dailyCompletion} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Daily target not yet available.
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
