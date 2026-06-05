import { describe, it, expect } from 'vitest';
import { dailyTargetFor, DAILY_TARGETS } from '../config.js';
import { challengeDayNumber } from '../services/dates.js';

describe('dailyTargetFor', () => {
  it('returns the published target for a known day', () => {
    expect(dailyTargetFor('2026-06-03')).toBe(100); // Day 1
    expect(dailyTargetFor('2026-06-13')).toBe(191); // Day 11
  });

  it('treats Sundays as rest days (0)', () => {
    expect(dailyTargetFor('2026-06-07')).toBe(0); // Day 5
    expect(dailyTargetFor('2026-06-14')).toBe(0); // Day 12
  });

  it('returns 0 for days outside the challenge', () => {
    expect(dailyTargetFor('2026-06-02')).toBe(0); // before Day 1
    expect(dailyTargetFor('2026-07-01')).toBe(0); // after the challenge
  });
});

describe('DAILY_TARGETS schedule integrity', () => {
  it('covers all 24 challenge days', () => {
    expect(Object.keys(DAILY_TARGETS)).toHaveLength(24);
  });

  it('sums to the campaign total of 3307', () => {
    const total = Object.values(DAILY_TARGETS).reduce((a, b) => a + b, 0);
    expect(total).toBe(3307);
  });
});

describe('challenge day numbering aligns with the schedule', () => {
  it('maps Day 1 to 2026-06-03', () => {
    expect(challengeDayNumber('2026-06-03')).toBe(1);
  });

  it('every scheduled date resolves to a valid day number', () => {
    for (const dayKey of Object.keys(DAILY_TARGETS)) {
      const n = challengeDayNumber(dayKey);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(24);
    }
  });
});
