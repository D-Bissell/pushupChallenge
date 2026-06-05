/**
 * Pure analytics used by the Insights and Trends pages. Kept free of React and
 * Firestore so they are trivially unit-testable.
 */
import type { Participant, Team, TeamSnapshot, ParticipantSnapshot } from '@/types';

export interface Insight {
  key: string;
  label: string;
  participant?: Participant;
  value: string;
  detail?: string;
}

/** Today's target push-ups for the whole team (target × active members). */
export function teamDailyTarget(team: Team, participants: Participant[]): number {
  const target = team.currentDay?.targetPerParticipant ?? 0;
  const active = participants.filter((p) => p.active).length || team.participantCount || 0;
  return target * active;
}

/** Team push-ups completed today (sum of members' today counts). */
export function teamTodayCompleted(participants: Participant[]): number {
  return participants.reduce((sum, p) => sum + p.todayPushUps, 0);
}

/** Percent of an individual's daily target completed (0–100+, uncapped). */
export function participantTargetPercent(p: Participant, perTarget: number): number {
  if (perTarget <= 0) return 0;
  return (p.todayPushUps / perTarget) * 100;
}

/**
 * True when today is a published rest day (a known challenge day whose
 * per-participant target is 0). Lets the UI say "rest day" instead of showing a
 * misleading 0% or "target not published".
 */
export function isRestDay(team: Team): boolean {
  return (
    !!team.currentDay &&
    team.currentDay.dayNumber != null &&
    team.currentDay.targetPerParticipant === 0
  );
}

/** Today's completion percentage for the team against its daily target. */
export function dailyCompletionPercent(team: Team, participants: Participant[]): number {
  const target = teamDailyTarget(team, participants);
  if (target <= 0) return 0;
  return (teamTodayCompleted(participants) / target) * 100;
}

/** Sort helper that ranks participants by a numeric field, descending. */
export function topBy<K extends keyof Participant>(
  participants: Participant[],
  field: K,
  n = participants.length
): Participant[] {
  return [...participants].sort((a, b) => Number(b[field]) - Number(a[field])).slice(0, n);
}

/**
 * Per-participant change in total push-ups between the two most recent snapshots
 * of the current day — i.e. "movement" since the last sync.
 */
export function biggestMover(
  participants: Participant[],
  snapshots: ParticipantSnapshot[]
): { participant: Participant; delta: number } | null {
  if (!participants.length) return null;
  // Group snapshots per participant, take the last two by time.
  const byId = new Map<string, ParticipantSnapshot[]>();
  for (const s of snapshots) {
    const arr = byId.get(s.participantId) ?? [];
    arr.push(s);
    byId.set(s.participantId, arr);
  }

  let best: { participant: Participant; delta: number } | null = null;
  for (const p of participants) {
    const series = (byId.get(p.participantId) ?? []).sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()
    );
    if (series.length < 2) continue;
    const delta = series[series.length - 1].totalPushUps - series[series.length - 2].totalPushUps;
    if (!best || delta > best.delta) best = { participant: p, delta };
  }
  // Fall back to today's leader if we have no historical deltas yet.
  if (!best) {
    const leader = topBy(participants, 'todayPushUps', 1)[0];
    return leader ? { participant: leader, delta: leader.todayPushUps } : null;
  }
  return best;
}

/** Most improved: largest growth in total push-ups across the snapshot window. */
export function mostImproved(
  participants: Participant[],
  snapshots: ParticipantSnapshot[]
): { participant: Participant; delta: number } | null {
  const byId = new Map<string, ParticipantSnapshot[]>();
  for (const s of snapshots) {
    const arr = byId.get(s.participantId) ?? [];
    arr.push(s);
    byId.set(s.participantId, arr);
  }
  let best: { participant: Participant; delta: number } | null = null;
  for (const p of participants) {
    const series = (byId.get(p.participantId) ?? []).sort(
      (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()
    );
    if (series.length < 2) continue;
    const delta = series[series.length - 1].totalPushUps - series[0].totalPushUps;
    if (!best || delta > best.delta) best = { participant: p, delta };
  }
  return best;
}

/**
 * Team momentum: push-ups added between consecutive team snapshots, i.e. the
 * first derivative of the cumulative total. Drives the momentum chart.
 */
export function momentumSeries(
  snapshots: TeamSnapshot[]
): Array<{ capturedAt: Date; delta: number; dayKey: string }> {
  const sorted = [...snapshots].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  const out: Array<{ capturedAt: Date; delta: number; dayKey: string }> = [];
  for (let i = 1; i < sorted.length; i++) {
    out.push({
      capturedAt: sorted[i].capturedAt,
      dayKey: sorted[i].dayKey,
      delta: Math.max(0, sorted[i].totalPushUps - sorted[i - 1].totalPushUps),
    });
  }
  return out;
}

/** Build the headline insight cards. */
export function buildInsights(
  team: Team,
  participants: Participant[],
  participantSnapshots: ParticipantSnapshot[]
): Insight[] {
  const insights: Insight[] = [];
  const perTarget = team.currentDay?.targetPerParticipant ?? 0;

  const mover = biggestMover(participants, participantSnapshots);
  if (mover) {
    insights.push({
      key: 'biggest-mover',
      label: 'Biggest mover today',
      participant: mover.participant,
      value: `+${mover.delta.toLocaleString()} push-ups`,
    });
  }

  const fundraiser = topBy(participants, 'fundraising', 1)[0];
  if (fundraiser) {
    insights.push({
      key: 'fundraising-leader',
      label: 'Fundraising leader',
      participant: fundraiser,
      value: `$${fundraiser.fundraising.toLocaleString()}`,
    });
  }

  const improved = mostImproved(participants, participantSnapshots);
  if (improved) {
    insights.push({
      key: 'most-improved',
      label: 'Most improved',
      participant: improved.participant,
      value: `+${improved.delta.toLocaleString()} over period`,
    });
  }

  const completion = topBy(participants, 'todayPushUps', 1)[0];
  if (completion) {
    const pct = perTarget > 0 ? Math.round((completion.todayPushUps / perTarget) * 100) : 0;
    insights.push({
      key: 'completion-leader',
      label: 'Completion leader (today)',
      participant: completion,
      value: perTarget > 0 ? `${pct}% of target` : `${completion.todayPushUps} today`,
    });
  }

  const totalLeader = topBy(participants, 'totalPushUps', 1)[0];
  if (totalLeader) {
    insights.push({
      key: 'push-up-leader',
      label: 'Push-up leader (total)',
      participant: totalLeader,
      value: `${totalLeader.totalPushUps.toLocaleString()} push-ups`,
    });
  }

  return insights;
}
