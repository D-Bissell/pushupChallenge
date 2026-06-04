import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TeamSnapshot } from '@/types';
import { momentumSeries } from '@/lib/analytics';
import { axisProps, gridProps, tooltipContentStyle, dayLabel, CHART_COLORS } from './chartTheme';
import { formatNumber } from '@/lib/format';

export function MomentumChart({ data }: { data: TeamSnapshot[] }) {
  const rows = momentumSeries(data).map((m) => ({ date: m.capturedAt, delta: m.delta }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tickFormatter={dayLabel} {...axisProps} />
        <YAxis tickFormatter={(v) => formatNumber(Number(v))} width={48} {...axisProps} />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelFormatter={(v) => dayLabel(v as Date)}
          formatter={(v) => [formatNumber(Number(v)), 'Push-ups added']}
        />
        <Bar dataKey="delta" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
