import { describe, it, expect } from 'vitest';
import { dayKeyInTimeZone, challengeDayNumber } from '../services/dates.js';

describe('dayKeyInTimeZone', () => {
  it('formats a UTC instant into the target timezone day', () => {
    // 2026-06-01T23:30:00Z is already 2026-06-02 in Sydney (UTC+10).
    const d = new Date('2026-06-01T23:30:00Z');
    expect(dayKeyInTimeZone(d, 'Australia/Sydney')).toBe('2026-06-02');
  });

  it('matches UTC date for UTC zone', () => {
    expect(dayKeyInTimeZone(new Date('2026-06-10T08:00:00Z'), 'UTC')).toBe('2026-06-10');
  });
});

describe('challengeDayNumber', () => {
  it('returns 1 for the start day', () => {
    expect(challengeDayNumber('2026-06-01', '2026-06-01')).toBe(1);
  });
  it('counts subsequent days', () => {
    expect(challengeDayNumber('2026-06-10', '2026-06-01')).toBe(10);
  });
  it('returns undefined before the challenge starts', () => {
    expect(challengeDayNumber('2026-05-31', '2026-06-01')).toBeUndefined();
  });
});
