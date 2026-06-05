/**
 * The official per-participant daily push-up target schedule, mirrored from the
 * backend collector config (`functions/src/config.ts`) so the UI can draw the
 * expected cumulative pace — "where the count should be up to" — on the
 * whole-challenge graph.
 *
 * The target changes daily to reflect mental-health statistics; Sundays are
 * rest days (0). The full 24-day schedule sums to 3307, the per-member
 * challenge target.
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

/** Scheduled day keys in ascending order. */
export const SORTED_DAYS = Object.keys(DAILY_TARGETS).sort();

/** Day 1 of the challenge (campaign-local), e.g. "2026-06-03". */
export const CHALLENGE_START = SORTED_DAYS[0];

/** Per-participant target for a given campaign-local day (0 if unknown). */
export function dailyTargetFor(dayKey: string): number {
  return DAILY_TARGETS[dayKey] ?? 0;
}

/**
 * Cumulative per-participant target the team should be at by the end of the
 * given day — the sum of every scheduled daily target up to and including it.
 * Returns 0 before the challenge starts.
 */
export function cumulativeTargetForDayKey(dayKey: string): number {
  let sum = 0;
  for (const day of SORTED_DAYS) {
    if (day > dayKey) break;
    sum += DAILY_TARGETS[day];
  }
  return sum;
}

/** Cumulative per-participant target across the whole challenge (sums to 3307). */
export const CHALLENGE_TOTAL_TARGET = SORTED_DAYS.reduce((a, d) => a + DAILY_TARGETS[d], 0);
