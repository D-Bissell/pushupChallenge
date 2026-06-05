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

  it('returns 0 for days not yet in the schedule', () => {
    expect(dailyTargetFor('2026-06-26')).toBe(0); // Day 24 (pending)
    expect(dailyTargetFor('2026-07-01')).toBe(0); // outside challenge
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
