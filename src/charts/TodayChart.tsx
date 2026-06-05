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
import { axisProps, gridProps, tooltipContentStyle, hourLabel, CHART_COLORS } from './chartTheme';
import { formatNumber } from '@/lib/format';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// The five theme colours, plus a few extras so every member on a typical team
// gets a distinct line before we have to cycle.
const palette = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
  'hsl(280 65% 62%)',
  'hsl(24 80% 55%)',
  'hsl(150 55% 45%)',
];

interface Props {
  participants: Participant[];
  /** Participant snapshots already filtered to the day being charted. */
  snapshots: ParticipantSnapshot[];
  /** The day to chart, as a "YYYY-MM-DD" key. */
  dayKey: string;
}

/**
 * Each member's push-ups for the day, one line per member, plotted across the
 * day. The axis runs 6am → midnight, reaching back earlier if someone logged
 * push-ups before 6am.
 */
export function TodayChart({ participants, snapshots, dayKey }: Props) {
  const members = [...participants].sort((a, b) => b.todayPushUps - a.todayPushUps);
  const nameById = new Map(members.map((p) => [p.participantId, p.name]));

  // Pivot snapshots into rows keyed by capture time, one column per member.
  const rowsByTime = new Map<number, Record<string, number>>();
  for (const s of snapshots) {
    const t = s.capturedAt.getTime();
    const row = rowsByTime.get(t) ?? { t };
    row[s.participantId] = s.todayPushUps;
    rowsByTime.set(t, row);
  }
  const rows = Array.from(rowsByTime.values()).sort((a, b) => a.t - b.t);

  const dayStart = new Date(`${dayKey}T00:00:00`).getTime();
  const sixAm = dayStart + 6 * HOUR_MS;
  const midnight = dayStart + DAY_MS;
  const earliest = rows.length ? rows[0].t : sixAm;
  const xStart = Math.min(sixAm, earliest);

  // Ticks every 3 hours from the start of the axis through midnight.
  const firstHour = Math.floor((xStart - dayStart) / HOUR_MS / 3) * 3;
  const ticks: number[] = [];
  for (let h = firstHour; h <= 24; h += 3) ticks.push(dayStart + h * HOUR_MS);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[xStart, midnight]}
          ticks={ticks}
          tickFormatter={hourLabel}
          {...axisProps}
        />
        <YAxis tickFormatter={(v) => formatNumber(Number(v))} width={48} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => hourLabel(Number(v))}
          formatter={(v, key) => [formatNumber(Number(v)), nameById.get(String(key)) ?? key]}
        />
        <Legend formatter={(key) => nameById.get(String(key)) ?? key} />
        {members.map((p, i) => (
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
