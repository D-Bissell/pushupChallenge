import { describe, it, expect } from 'vitest';
import {
  CHALLENGE_START,
  CHALLENGE_TOTAL_TARGET,
  cumulativeTargetForDayKey,
  dailyTargetFor,
} from '@/lib/challenge';

describe('challenge schedule', () => {
  it('starts on day 1', () => {
    expect(CHALLENGE_START).toBe('2026-06-03');
  });

  it('sums to the per-member challenge target', () => {
    expect(CHALLENGE_TOTAL_TARGET).toBe(3307);
  });

  it('reads the daily target, with Sundays as rest days', () => {
    expect(dailyTargetFor('2026-06-03')).toBe(100); // Day 1
    expect(dailyTargetFor('2026-06-07')).toBe(0); // Day 5 · Sun (rest)
  });
});

describe('cumulativeTargetForDayKey', () => {
  it('accumulates the daily targets up to and including the day', () => {
    expect(cumulativeTargetForDayKey('2026-06-03')).toBe(100); // day 1
    expect(cumulativeTargetForDayKey('2026-06-04')).toBe(172); // + 72
    expect(cumulativeTargetForDayKey('2026-06-05')).toBe(292); // + 120
  });

  it('is 0 before the challenge starts', () => {
    expect(cumulativeTargetForDayKey('2026-06-02')).toBe(0);
  });

  it('reaches the full target by the final day', () => {
    expect(cumulativeTargetForDayKey('2026-06-26')).toBe(CHALLENGE_TOTAL_TARGET);
  });
});
