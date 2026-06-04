/** Shared Recharts styling so all charts feel like one system. */

export const CHART_COLORS = {
  1: 'hsl(var(--chart-1))',
  2: 'hsl(var(--chart-2))',
  3: 'hsl(var(--chart-3))',
  4: 'hsl(var(--chart-4))',
  5: 'hsl(var(--chart-5))',
} as const;

export const axisProps = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

/** Tooltip styling object passed to Recharts <Tooltip contentStyle>. */
export const tooltipContentStyle: React.CSSProperties = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
};

/** Short day label, e.g. "Jun 12". */
export function dayLabel(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}
