/**
 * Bundled sample data. Used in two places:
 *  - "demo mode" when Firebase isn't configured (so the dashboard always renders);
 *  - component/unit tests, as a realistic fixture.
 *
 * Shapes mirror exactly what the Firestore reader returns.
 */
import type {
  Team,
  Participant,
  TeamSnapshot,
  FundraisingSnapshot,
  ParticipantSnapshot,
  SyncRun,
} from '@/types';

const DAY_MS = 86_400_000;
const now = new Date('2026-06-12T08:00:00+10:00');

export const sampleTeam: Team = {
  teamId: 'a23',
  slug: 'a23',
  name: 'A23 Office Warriors',
  totalPushUps: 48210,
  fundraising: 3275.5,
  fundraisingGoal: 5000,
  participantCount: 6,
  challengeTargetPerParticipant: 3307,
  rank: 14,
  currentDay: { dayKey: '2026-06-12', dayNumber: 12, targetPerParticipant: 88 },
  updatedAt: new Date(now.getTime() - 3 * 60 * 1000),
};

export const sampleParticipants: Participant[] = [
  p('1001', 'Dana Bissell', 88, 12050, 1200, 1),
  p('1002', 'Sam Carter', 64, 9800, 740, 2),
  p('1003', 'Priya Nair', 88, 8600, 510.5, 3),
  p('1004', 'Leo Martins', 40, 7300, 320, 4),
  p('1005', 'Mia Wong', 88, 6450, 305, 5),
  p('1006', 'Tom Fischer', 0, 4010, 200, 6),
];

function p(
  id: string,
  name: string,
  todayPushUps: number,
  totalPushUps: number,
  fundraising: number,
  rank: number
): Participant {
  return {
    participantId: id,
    teamId: 'a23',
    name,
    slug: null,
    todayPushUps,
    totalPushUps,
    fundraising,
    rank,
    avatarUrl: null,
    active: true,
    updatedAt: now,
  };
}

/** 12 days of plausibly-growing team snapshots. */
export const sampleTeamSnapshots: TeamSnapshot[] = Array.from({ length: 12 }, (_, i) => {
  const day = i + 1;
  const captured = new Date(now.getTime() - (12 - day) * DAY_MS);
  return {
    capturedAt: captured,
    dayKey: captured.toISOString().slice(0, 10),
    totalPushUps: Math.round(48210 * (day / 12) ** 1.1),
    fundraising: Math.round(3275.5 * (day / 12) ** 1.25 * 100) / 100,
    participantCount: 6,
    rank: 30 - day,
  };
});

export const sampleFundraisingSnapshots: FundraisingSnapshot[] = sampleTeamSnapshots.map((s) => ({
  capturedAt: s.capturedAt,
  dayKey: s.dayKey,
  fundraising: s.fundraising,
}));

export const sampleParticipantSnapshots: ParticipantSnapshot[] = sampleParticipants.flatMap(
  (part) =>
    sampleTeamSnapshots.map((s, i) => ({
      participantId: part.participantId,
      capturedAt: s.capturedAt,
      dayKey: s.dayKey,
      todayPushUps: part.todayPushUps,
      totalPushUps: Math.round(part.totalPushUps * ((i + 1) / 12)),
      fundraising: Math.round(part.fundraising * ((i + 1) / 12) * 100) / 100,
      rank: part.rank,
    }))
);

export const sampleSyncRun: SyncRun = {
  teamId: 'a23',
  status: 'success',
  provider: 'funraisin-api',
  finishedAt: new Date(now.getTime() - 3 * 60 * 1000),
  durationMs: 1840,
  participantsWritten: 6,
};
