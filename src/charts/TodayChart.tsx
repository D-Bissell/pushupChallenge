import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ParticipantSnapshot } from '@/types';
import { axisProps, gridProps, tooltipContentStyle, hourLabel, CHART_COLORS } from './chartTheme';
import { formatNumber } from '@/lib/format';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

interface Props {
  /** Participant snapshots already filtered to the day being charted. */
  snapshots: ParticipantSnapshot[];
  /** The day to chart, as a "YYYY-MM-DD" key. */
  dayKey: string;
}

/**
 * The whole team's push-ups *for the day*, plotted across the day. Each capture
 * sums every member's running today-count, giving a live picture of the day's
 * progress. The axis runs 6am → midnight, reaching back earlier if someone
 * logged push-ups before 6am.
 */
export function TodayChart({ snapshots, dayKey }: Props) {
  const rows = toTodaySeries(snapshots);

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
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="todayFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          formatter={(v) => [formatNumber(Number(v)), 'Push-ups today']}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={CHART_COLORS[1]}
          strokeWidth={2}
          fill="url(#todayFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Collapse per-participant snapshots into the team's running today-total at each
 * capture time. Exposed for unit testing independent of Recharts.
 */
export function toTodaySeries(
  snapshots: ParticipantSnapshot[]
): Array<{ t: number; total: number }> {
  const byTime = new Map<number, number>();
  for (const s of snapshots) {
    const t = s.capturedAt.getTime();
    byTime.set(t, (byTime.get(t) ?? 0) + s.todayPushUps);
  }
  return Array.from(byTime.entries())
    .map(([t, total]) => ({ t, total }))
    .sort((a, b) => a.t - b.t);
}
