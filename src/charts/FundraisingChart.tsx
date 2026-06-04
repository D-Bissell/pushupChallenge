import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FundraisingSnapshot } from '@/types';
import { axisProps, gridProps, tooltipContentStyle, dayLabel, CHART_COLORS } from './chartTheme';
import { formatCurrency } from '@/lib/format';

export function FundraisingChart({ data }: { data: FundraisingSnapshot[] }) {
  const rows = data.map((s) => ({ date: s.capturedAt, raised: s.fundraising }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fundraisingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS[2]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART_COLORS[2]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tickFormatter={dayLabel} {...axisProps} />
        <YAxis tickFormatter={(v) => formatCurrency(Number(v))} width={56} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(v as Date)}
          formatter={(v) => [formatCurrency(Number(v), true), 'Raised']}
        />
        <Area
          type="monotone"
          dataKey="raised"
          stroke={CHART_COLORS[2]}
          strokeWidth={2}
          fill="url(#fundraisingFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
