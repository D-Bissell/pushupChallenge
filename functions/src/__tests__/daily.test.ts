import { describe, it, expect } from 'vitest';
import { computeTodayPushUps } from '../services/daily.js';

describe('computeTodayPushUps', () => {
  it('starts at 0 with no prior data (anchors baseline to current)', () => {
    const r = computeTodayPushUps({
      currentTotal: 5000,
      prevTotal: undefined,
      prevBaseline: undefined,
      dayKey: '2026-06-12',
    });
    expect(r.todayPushUps).toBe(0);
    expect(r.baseline).toEqual({ dayKey: '2026-06-12', totalAtStart: 5000 });
  });

  it('accumulates within the same day using the kept baseline', () => {
    const r = computeTodayPushUps({
      currentTotal: 5150,
      prevTotal: 5100,
      prevBaseline: { dayKey: '2026-06-12', totalAtStart: 5000 },
      dayKey: '2026-06-12',
    });
    expect(r.todayPushUps).toBe(150);
    expect(r.baseline.totalAtStart).toBe(5000); // unchanged
  });

  it('rolls the baseline over at a new day using the previous run total', () => {
    const r = computeTodayPushUps({
      currentTotal: 5230,
      prevTotal: 5200, // end of yesterday
      prevBaseline: { dayKey: '2026-06-11', totalAtStart: 4800 },
      dayKey: '2026-06-12',
    });
    expect(r.baseline).toEqual({ dayKey: '2026-06-12', totalAtStart: 5200 });
    expect(r.todayPushUps).toBe(30);
  });

  it('never goes negative if a total is corrected downward', () => {
    const r = computeTodayPushUps({
      currentTotal: 4900,
      prevTotal: 5000,
      prevBaseline: { dayKey: '2026-06-12', totalAtStart: 5000 },
      dayKey: '2026-06-12',
    });
    expect(r.todayPushUps).toBe(0);
  });
});
