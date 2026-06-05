import type { TeamTarget } from './types/index.js';

/**
 * Static configuration for the data collector.
 *
 * Multi-team support is intentional: the scheduled function iterates over
 * `TRACKED_TEAMS`, so adding a team is a one-line change here (plus, optionally,
 * a `config/teams` Firestore document which overrides this list at runtime).
 */

export const SOURCE_BASE_URL = 'https://www.thepushupchallenge.com.au';

/** IANA timezone the campaign runs in — used to compute the campaign-local day. */
export const CAMPAIGN_TIMEZONE = 'Australia/Sydney';

/** Teams tracked out of the box. */
export const TRACKED_TEAMS: TeamTarget[] = [
  {
    teamId: 'a23',
    slug: 'a23',
    baseUrl: SOURCE_BASE_URL,
  },
];

/**
 * The 2026 challenge runs Wed 3 June → Fri 26 June (24 days). Day 1 = 2026-06-03.
 */
export const CHALLENGE_START = '2026-06-03';
export const CHALLENGE_DAYS = 24;

/**
 * Official per-participant daily push-up targets, keyed by campaign-local day
 * (yyyy-mm-dd). The target changes daily to reflect mental-health statistics;
 * Sundays are rest days (0). Source: the official "daily targets" schedule.
 *
 * The full 24-day schedule sums to 3307 (the per-member challenge target shown
 * on the source page) — see config.test.ts, which guards that total.
 */
export const DAILY_TARGETS: Record<string, number> = {
  '2026-06-03': 100, // Day 1  · Wed
  '2026-06-04': 72, //  Day 2  · Thu
  '2026-06-05': 120, // Day 3  · Fri
  '2026-06-06': 150, // Day 4  · Sat
  '2026-06-07': 0, //   Day 5  · Sun (rest)
  '2026-06-08': 140, // Day 6  · Mon
  '2026-06-09': 170, // Day 7  · Tue
  '2026-06-10': 130, // Day 8  · Wed
  '2026-06-11': 160, // Day 9  · Thu
  '2026-06-12': 167, // Day 10 · Fri
  '2026-06-13': 191, // Day 11 · Sat
  '2026-06-14': 0, //   Day 12 · Sun (rest)
  '2026-06-15': 120, // Day 13 · Mon
  '2026-06-16': 220, // Day 14 · Tue
  '2026-06-17': 160, // Day 15 · Wed
  '2026-06-18': 190, // Day 16 · Thu
  '2026-06-19': 170, // Day 17 · Fri
  '2026-06-20': 208, // Day 18 · Sat
  '2026-06-21': 0, //   Day 19 · Sun (rest)
  '2026-06-22': 120, // Day 20 · Mon
  '2026-06-23': 180, // Day 21 · Tue
  '2026-06-24': 229, // Day 22 · Wed
  '2026-06-25': 160, // Day 23 · Thu
  '2026-06-26': 150, // Day 24 · Fri
};

/** Per-participant push-up target for a given campaign-local day (0 if unknown). */
export function dailyTargetFor(dayKey: string): number {
  return DAILY_TARGETS[dayKey] ?? 0;
}

/** Cumulative per-participant target across the whole challenge (sums to 3307). */
export const CHALLENGE_TOTAL_TARGET = Object.values(DAILY_TARGETS).reduce((a, b) => a + b, 0);

/** Provider behaviour. */
export const COLLECTION = {
  timeoutMs: 15_000,
  retries: 3,
  backoffBaseMs: 1_000,
  /** Max participants to request per page from the source. */
  pageSize: 50,
};
