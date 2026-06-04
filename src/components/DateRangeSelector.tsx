import { Button } from '@/components/ui/button';
import type { DateRange } from '@/types';

export type RangePreset = '7d' | '14d' | '30d' | 'all';

const PRESETS: { key: RangePreset; label: string; days: number | null }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '14d', label: '14 days', days: 14 },
  { key: '30d', label: '30 days', days: 30 },
  { key: 'all', label: 'All', days: null },
];

export function rangeFromPreset(preset: RangePreset, now = new Date()): DateRange | undefined {
  const found = PRESETS.find((p) => p.key === preset);
  if (!found || found.days === null) return undefined;
  const from = new Date(now.getTime() - found.days * 86_400_000);
  return { from, to: now };
}

export function DateRangeSelector({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          size="sm"
          variant={value === p.key ? 'default' : 'ghost'}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
