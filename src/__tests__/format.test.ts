import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatCompact,
  formatPercent,
  clampPercent,
  timeAgo,
  initials,
} from '@/lib/format';

describe('formatCurrency', () => {
  it('formats AUD without cents by default', () => {
    expect(formatCurrency(3275.5)).toBe('$3,276');
  });
  it('formats with cents when precise', () => {
    expect(formatCurrency(3275.5, true)).toBe('$3,275.50');
  });
  it('handles non-finite values', () => {
    expect(formatCurrency(NaN)).toBe('$0');
  });
});

describe('formatNumber & formatCompact', () => {
  it('groups thousands', () => expect(formatNumber(48210)).toBe('48,210'));
  it('compacts large numbers', () => expect(formatCompact(48210)).toBe('48.2K'));
});

describe('formatPercent & clampPercent', () => {
  it('formats percentages', () => expect(formatPercent(87.4)).toBe('87%'));
  it('clamps to 0–100', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(42)).toBe(42);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-06-12T10:00:00Z');
  it('reports just now for recent times', () => {
    expect(timeAgo(new Date('2026-06-12T09:59:50Z'), now)).toBe('just now');
  });
  it('reports minutes', () => {
    expect(timeAgo(new Date('2026-06-12T09:57:00Z'), now)).toBe('3m ago');
  });
  it('reports hours', () => {
    expect(timeAgo(new Date('2026-06-12T07:00:00Z'), now)).toBe('3h ago');
  });
  it('handles null', () => expect(timeAgo(null)).toBe('never'));
});

describe('initials', () => {
  it('takes first two name parts', () => expect(initials('Dana Bissell')).toBe('DB'));
  it('handles single names', () => expect(initials('Madonna')).toBe('M'));
});
