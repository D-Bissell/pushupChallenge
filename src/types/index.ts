/**
 * Frontend domain types — the read-side view of the Firestore documents written
 * by the Functions backend. Kept independent of the backend package so the two
 * can evolve and deploy separately.
 */

export interface Team {
  teamId: string;
  slug: string;
  name: string;
  totalPushUps: number;
  fundraising: number;
  fundraisingGoal: number | null;
  participantCount: number;
  /** Cumulative per-participant push-up target for the whole challenge. */
  challengeTargetPerParticipant: number | null;
  rank: number | null;
  currentDay: ChallengeDay | null;
  updatedAt: Date | null;
}

export interface ChallengeDay {
  dayKey: string;
  dayNumber: number | null;
  targetPerParticipant: number;
}

export interface Participant {
  participantId: string;
  teamId: string;
  name: string;
  slug: string | null;
  todayPushUps: number;
  totalPushUps: number;
  fundraising: number;
  rank: number | null;
  avatarUrl: string | null;
  active: boolean;
  updatedAt: Date | null;
}

export interface TeamSnapshot {
  capturedAt: Date;
  dayKey: string;
  totalPushUps: number;
  fundraising: number;
  participantCount: number;
  rank: number | null;
}

export interface ParticipantSnapshot {
  participantId: string;
  capturedAt: Date;
  dayKey: string;
  todayPushUps: number;
  totalPushUps: number;
  fundraising: number;
  rank: number | null;
}

export interface FundraisingSnapshot {
  capturedAt: Date;
  dayKey: string;
  fundraising: number;
}

export type SyncStatus = 'success' | 'partial' | 'error';

export interface SyncRun {
  teamId: string;
  status: SyncStatus;
  provider: string;
  finishedAt: Date | null;
  durationMs: number;
  participantsWritten: number;
  error?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface DateRange {
  from: Date;
  to: Date;
}
