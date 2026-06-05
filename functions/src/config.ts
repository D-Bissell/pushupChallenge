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
 * Days 14–24 (2026-06-16 … 2026-06-26) are pending the published numbers — until
 * filled, `dailyTargetFor` returns 0 for those days and the UI shows "—" rather
 * than a wrong percentage.
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
  // '2026-06-16': ?, // Day 14 · Tue   ← pending
  // '2026-06-17': ?, // Day 15 · Wed   ← pending
  // '2026-06-18': ?, // Day 16 · Thu   ← pending
  // '2026-06-19': ?, // Day 17 · Fri   ← pending
  // '2026-06-20': ?, // Day 18 · Sat   ← pending
  // '2026-06-21': 0, // Day 19 · Sun (rest)
  // '2026-06-22': ?, // Day 20 · Mon   ← pending
  // '2026-06-23': ?, // Day 21 · Tue   ← pending
  // '2026-06-24': ?, // Day 22 · Wed   ← pending
  // '2026-06-25': ?, // Day 23 · Thu   ← pending
  // '2026-06-26': ?, // Day 24 · Fri   ← pending
};

/** Per-participant push-up target for a given campaign-local day (0 if unknown). */
export function dailyTargetFor(dayKey: string): number {
  return DAILY_TARGETS[dayKey] ?? 0;
}

/** Provider behaviour. */
export const COLLECTION = {
  timeoutMs: 15_000,
  retries: 3,
  backoffBaseMs: 1_000,
  /** Max participants to request per page from the source. */
  pageSize: 50,
};
