import { describe, it, expect } from 'vitest';
import {
  teamDailyTarget,
  teamTodayCompleted,
  dailyCompletionPercent,
  participantTargetPercent,
  isRestDay,
  topBy,
  biggestMover,
  mostImproved,
  momentumSeries,
  buildInsights,
} from '@/lib/analytics';
import {
  sampleTeam,
  sampleParticipants,
  sampleParticipantSnapshots,
  sampleTeamSnapshots,
} from '@/services/sampleData';

describe('team daily metrics', () => {
  it('computes the team daily target (target × active members)', () => {
    // 88 target × 6 active members.
    expect(teamDailyTarget(sampleTeam, sampleParticipants)).toBe(88 * 6);
  });
  it('sums today push-ups', () => {
    expect(teamTodayCompleted(sampleParticipants)).toBe(88 + 64 + 88 + 40 + 88 + 0);
  });
  it('derives daily completion percentage', () => {
    const pct = dailyCompletionPercent(sampleTeam, sampleParticipants);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });
  it('returns 0 completion when no target', () => {
    const noTarget = { ...sampleTeam, currentDay: null };
    expect(dailyCompletionPercent(noTarget, sampleParticipants)).toBe(0);
  });
});

describe('isRestDay', () => {
  it('is false on a normal day with a target', () => {
    expect(isRestDay(sampleTeam)).toBe(false);
  });
  it('is true when a known challenge day has a zero target', () => {
    const rest = {
      ...sampleTeam,
      currentDay: { dayKey: '2026-06-07', dayNumber: 5, targetPerParticipant: 0 },
    };
    expect(isRestDay(rest)).toBe(true);
  });
  it('is false when there is no current day', () => {
    expect(isRestDay({ ...sampleTeam, currentDay: null })).toBe(false);
  });
});

describe('participantTargetPercent', () => {
  it('computes percentage of personal target', () => {
    expect(participantTargetPercent(sampleParticipants[0], 88)).toBe(100);
  });
  it('returns 0 when target is 0', () => {
    expect(participantTargetPercent(sampleParticipants[0], 0)).toBe(0);
  });
});

describe('topBy', () => {
  it('returns the top N by a field, descending', () => {
    const top2 = topBy(sampleParticipants, 'fundraising', 2);
    expect(top2).toHaveLength(2);
    expect(top2[0].name).toBe('Dana Bissell');
  });
});

describe('mostImproved & momentum', () => {
  it('finds the most improved participant over the window', () => {
    const result = mostImproved(sampleParticipants, sampleParticipantSnapshots);
    expect(result).not.toBeNull();
    expect(result!.delta).toBeGreaterThan(0);
  });
  it('produces a non-negative momentum series', () => {
    const series = momentumSeries(sampleTeamSnapshots);
    expect(series.length).toBe(sampleTeamSnapshots.length - 1);
    expect(series.every((s) => s.delta >= 0)).toBe(true);
  });
});

describe('biggestMover', () => {
  it('falls back to today leader when no history', () => {
    const result = biggestMover(sampleParticipants, []);
    expect(result?.participant).toBeDefined();
  });
});

describe('buildInsights', () => {
  it('builds the expected set of insight cards', () => {
    const insights = buildInsights(sampleTeam, sampleParticipants, sampleParticipantSnapshots);
    const keys = insights.map((i) => i.key);
    expect(keys).toContain('fundraising-leader');
    expect(keys).toContain('push-up-leader');
    expect(insights.length).toBeGreaterThanOrEqual(4);
  });
});
