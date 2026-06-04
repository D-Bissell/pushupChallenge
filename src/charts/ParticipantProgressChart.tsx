import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Participant, ParticipantSnapshot } from '@/types';
import { axisProps, gridProps, tooltipContentStyle, dayLabel, CHART_COLORS } from './chartTheme';
import { formatCompact, formatNumber } from '@/lib/format';

interface Props {
  participants: Participant[];
  snapshots: ParticipantSnapshot[];
  /** Limit lines to the top N participants by total to keep the chart readable. */
  topN?: number;
}

const palette = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
];

/** Multi-line chart of each (top-N) participant's cumulative push-ups over time. */
export function ParticipantProgressChart({ participants, snapshots, topN = 5 }: Props) {
  const top = [...participants].sort((a, b) => b.totalPushUps - a.totalPushUps).slice(0, topN);
  const ids = top.map((p) => p.participantId);
  const nameById = new Map(top.map((p) => [p.participantId, p.name]));

  // Pivot snapshots into rows keyed by capture time.
  const rowsByTime = new Map<number, Record<string, number | Date>>();
  for (const s of snapshots) {
    if (!ids.includes(s.participantId)) continue;
    const t = s.capturedAt.getTime();
    const row = rowsByTime.get(t) ?? { date: s.capturedAt };
    row[s.participantId] = s.totalPushUps;
    rowsByTime.set(t, row);
  }
  const rows = Array.from(rowsByTime.values()).sort(
    (a, b) => (a.date as Date).getTime() - (b.date as Date).getTime()
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tickFormatter={(v) => dayLabel(v as Date)} {...axisProps} />
        <YAxis tickFormatter={(v) => formatCompact(Number(v))} width={48} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(v as Date)}
          formatter={(v, key) => [formatNumber(Number(v)), nameById.get(String(key)) ?? key]}
        />
        <Legend formatter={(key) => nameById.get(String(key)) ?? key} />
        {top.map((p, i) => (
          <Line
            key={p.participantId}
            type="monotone"
            dataKey={p.participantId}
            stroke={palette[i % palette.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
