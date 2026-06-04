import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ParticipantSnapshot, TeamSnapshot } from '@/types';
import { axisProps, gridProps, tooltipContentStyle, dayLabel, CHART_COLORS } from './chartTheme';
import { formatPercent } from '@/lib/format';

interface Props {
  /** Per-day completion percentage rows (already aggregated). */
  data: Array<{ dayKey: string; percent: number }>;
}

/**
 * Daily completion percentage: how much of each day's target the team hit.
 * 100% line is highlighted; days at/above target turn green.
 */
export function DailyCompletionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="dayKey" tickFormatter={dayLabel} {...axisProps} />
        <YAxis tickFormatter={(v) => `${v}%`} width={44} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(v as string)}
          formatter={(v) => [formatPercent(Number(v)), 'Completion']}
        />
        <ReferenceLine y={100} stroke={CHART_COLORS[2]} strokeDasharray="4 4" />
        <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
          {data.map((row) => (
            <Cell key={row.dayKey} fill={row.percent >= 100 ? CHART_COLORS[2] : CHART_COLORS[1]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Helper to turn raw snapshots into daily completion rows. Exposed so it can be
 * unit tested independently of the chart.
 */
export function toDailyCompletion(
  teamSnapshots: TeamSnapshot[],
  participantSnapshots: ParticipantSnapshot[],
  targetPerParticipant: number
): Array<{ dayKey: string; percent: number }> {
  if (targetPerParticipant <= 0) return [];
  // Best (max) total per participant per day approximates that day's contribution.
  const byDay = new Map<string, { participants: Set<string>; today: number }>();
  for (const s of participantSnapshots) {
    const entry = byDay.get(s.dayKey) ?? { participants: new Set(), today: 0 };
    entry.participants.add(s.participantId);
    entry.today = Math.max(entry.today, 0); // placeholder; replaced below
    byDay.set(s.dayKey, entry);
  }
  // Sum the max todayPushUps seen per participant per day.
  const dayParticipantMax = new Map<string, Map<string, number>>();
  for (const s of participantSnapshots) {
    const m = dayParticipantMax.get(s.dayKey) ?? new Map<string, number>();
    m.set(s.participantId, Math.max(m.get(s.participantId) ?? 0, s.todayPushUps));
    dayParticipantMax.set(s.dayKey, m);
  }

  const dayKeys = teamSnapshots.length
    ? Array.from(new Set(teamSnapshots.map((s) => s.dayKey)))
    : Array.from(byDay.keys());

  return dayKeys.sort().map((dayKey) => {
    const perMap = dayParticipantMax.get(dayKey);
    const completed = perMap ? Array.from(perMap.values()).reduce((a, b) => a + b, 0) : 0;
    const memberCount = byDay.get(dayKey)?.participants.size ?? 0;
    const target = targetPerParticipant * memberCount;
    const percent = target > 0 ? Math.round((completed / target) * 100) : 0;
    return { dayKey, percent };
  });
}
