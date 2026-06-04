/** Presentation formatting helpers (pure, unit-tested). */

const currency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat('en-AU');

export function formatCurrency(value: number, precise = false): string {
  if (!Number.isFinite(value)) return '$0';
  return (precise ? currencyPrecise : currency).format(value);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return number.format(Math.round(value));
}

/** Compact form for large totals, e.g. 48210 -> "48.2k". */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-AU', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  );
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(digits)}%`;
}

/** Clamp a percentage into the 0–100 range for progress bars. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** Relative "x minutes ago" for the last-updated indicator. */
export function timeAgo(date: Date | null, now: Date = new Date()): string {
  if (!date) return 'never';
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
