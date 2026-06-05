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
import { formatCompact, formatCurrency, formatNumber } from '@/lib/format';

type Metric = 'totalPushUps' | 'fundraising';

interface Props {
  participants: Participant[];
  snapshots: ParticipantSnapshot[];
  /** Which per-participant value to chart. Defaults to cumulative push-ups. */
  metric?: Metric;
  /** Limit lines to the top N participants by the chosen metric, for readability. */
  topN?: number;
}

const palette = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
];

/** Multi-line chart of each (top-N) participant's chosen metric over time. */
export function ParticipantProgressChart({
  participants,
  snapshots,
  metric = 'totalPushUps',
  topN = 5,
}: Props) {
  const isMoney = metric === 'fundraising';
  const yFormat = isMoney ? (v: number) => formatCurrency(v) : (v: number) => formatCompact(v);
  const valueFormat = isMoney
    ? (v: number) => formatCurrency(v, true)
    : (v: number) => formatNumber(v);

  const top = [...participants].sort((a, b) => b[metric] - a[metric]).slice(0, topN);
  const ids = top.map((p) => p.participantId);
  const nameById = new Map(top.map((p) => [p.participantId, p.name]));

  // Pivot snapshots into rows keyed by capture time.
  const rowsByTime = new Map<number, Record<string, number | Date>>();
  for (const s of snapshots) {
    if (!ids.includes(s.participantId)) continue;
    const t = s.capturedAt.getTime();
    const row = rowsByTime.get(t) ?? { date: s.capturedAt };
    row[s.participantId] = s[metric];
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
        <YAxis tickFormatter={(v) => yFormat(Number(v))} width={isMoney ? 56 : 48} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(v as Date)}
          formatter={(v, key) => [valueFormat(Number(v)), nameById.get(String(key)) ?? key]}
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
