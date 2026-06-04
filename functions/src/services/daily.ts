/**
 * Per-day push-up derivation.
 *
 * A single page fetch only exposes *cumulative* totals, so "today's" push-ups
 * are computed by diffing the current total against a baseline captured at the
 * start of the campaign-local day. The baseline is stored on each participant
 * doc (`dayBaseline`) and rolls over at the day boundary using the previous
 * run's total (≈ end of yesterday). This keeps the computation index-free and
 * timezone-math-free.
 */
export interface DayBaseline {
  dayKey: string;
  totalAtStart: number;
}

export interface TodayResult {
  todayPushUps: number;
  baseline: DayBaseline;
}

export function computeTodayPushUps(opts: {
  /** The member's current cumulative push-ups (this run). */
  currentTotal: number;
  /** The member's cumulative total stored from the previous run, if any. */
  prevTotal: number | undefined;
  /** The baseline stored from the previous run, if any. */
  prevBaseline: DayBaseline | undefined;
  /** Today's campaign-local day key (yyyy-mm-dd). */
  dayKey: string;
}): TodayResult {
  const { currentTotal, prevTotal, prevBaseline, dayKey } = opts;

  // Same day → keep the existing baseline. New day (or first ever) → start a new
  // one anchored to the previous run's total (the close of the prior day). With
  // no prior data, anchor to the current total so today starts at 0.
  const baseline: DayBaseline =
    prevBaseline && prevBaseline.dayKey === dayKey
      ? prevBaseline
      : { dayKey, totalAtStart: prevTotal ?? currentTotal };

  // max(0, …) guards against any upstream correction that lowers a total.
  const todayPushUps = Math.max(0, currentTotal - baseline.totalAtStart);
  return { todayPushUps, baseline };
}
