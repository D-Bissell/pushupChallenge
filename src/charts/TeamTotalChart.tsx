import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TeamSnapshot } from '@/types';
import { axisProps, gridProps, tooltipContentStyle, dayLabel, CHART_COLORS } from './chartTheme';
import { formatCompact, formatNumber } from '@/lib/format';

export function TeamTotalChart({ data }: { data: TeamSnapshot[] }) {
  const rows = data.map((s) => ({ date: s.capturedAt, total: s.totalPushUps }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="teamTotalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tickFormatter={dayLabel} {...axisProps} />
        <YAxis tickFormatter={(v) => formatCompact(Number(v))} width={48} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(v as Date)}
          formatter={(v) => [formatNumber(Number(v)), 'Total push-ups']}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={CHART_COLORS[1]}
          strokeWidth={2}
          fill="url(#teamTotalFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
