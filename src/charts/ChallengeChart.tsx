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
import { axisProps, gridProps, tooltipContentStyle, dayLabel } from './chartTheme';
import { formatCompact, formatNumber } from '@/lib/format';
import { CHART_PALETTE } from './palette';
import { CHALLENGE_START, SORTED_DAYS, cumulativeTargetForDayKey } from '@/lib/challenge';

const DAY_MS = 86_400_000;
const TARGET_KEY = '__target';

interface Props {
  participants: Participant[];
  /** All participant snapshots across the challenge. */
  snapshots: ParticipantSnapshot[];
  /** The current challenge day key, used to extend the axis when data is sparse. */
  currentDayKey?: string | null;
}

/** Midnight (local) timestamp for a "YYYY-MM-DD" key. */
const dayStartMs = (dayKey: string) => Date.parse(`${dayKey}T00:00:00`);

/**
 * Each member's cumulative push-ups across the whole challenge, on a date axis
 * that always starts at day 1 — even if tracking began late and the early days
 * have no data. A dashed line shows the expected cumulative pace (the running
 * sum of the official daily targets), i.e. where the count *should* be up to.
 */
export function ChallengeChart({ participants, snapshots, currentDayKey }: Props) {
  const members = [...participants].sort((a, b) => b.totalPushUps - a.totalPushUps);
  const nameById = new Map(members.map((p) => [p.participantId, p.name]));

  // How far the challenge has progressed: the latest of the current day and any
  // day we have data for. Drives how much of the target pace line we draw.
  const latestDayKey =
    [currentDayKey ?? '', ...snapshots.map((s) => s.dayKey)].filter(Boolean).sort().pop() ??
    CHALLENGE_START;

  // One row per capture time (member values) merged with one row per challenge
  // day (the target pace). Each series fills only its own points and uses
  // connectNulls, so they coexist on the shared time axis.
  const rowsByT = new Map<number, Record<string, number>>();
  for (const s of snapshots) {
    const t = s.capturedAt.getTime();
    const row = rowsByT.get(t) ?? { t };
    row[s.participantId] = s.totalPushUps;
    rowsByT.set(t, row);
  }
  for (const day of SORTED_DAYS) {
    if (day > latestDayKey) break;
    const t = dayStartMs(day);
    const row = rowsByT.get(t) ?? { t };
    row[TARGET_KEY] = cumulativeTargetForDayKey(day);
    rowsByT.set(t, row);
  }
  const rows = Array.from(rowsByT.values()).sort((a, b) => a.t - b.t);

  // Axis runs from day 1 to the latest data point (or the current day if later).
  const start = dayStartMs(CHALLENGE_START);
  const maxDataT = snapshots.reduce((m, s) => Math.max(m, s.capturedAt.getTime()), start);
  const end = Math.max(maxDataT, dayStartMs(latestDayKey) + DAY_MS);

  // Aim for ~8 evenly spaced day ticks across the range.
  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
  const step = Math.max(1, Math.ceil(totalDays / 8));
  const ticks: number[] = [];
  for (let t = start; t <= end; t += step * DAY_MS) ticks.push(t);

  const label = (key: string) => (key === TARGET_KEY ? 'Target' : (nameById.get(key) ?? key));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={[start, end]}
          ticks={ticks}
          tickFormatter={(v) => dayLabel(new Date(Number(v)))}
          {...axisProps}
        />
        <YAxis tickFormatter={(v) => formatCompact(Number(v))} width={48} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(new Date(Number(v)))}
          formatter={(v, key) => [formatNumber(Number(v)), label(String(key))]}
        />
        <Legend formatter={(key) => label(String(key))} />
        {members.map((p, i) => (
          <Line
            key={p.participantId}
            type="monotone"
            dataKey={p.participantId}
            stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
        <Line
          type="stepAfter"
          dataKey={TARGET_KEY}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
