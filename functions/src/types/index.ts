/**
 * Domain types shared across the data-collection backend.
 *
 * These describe the *normalised* shape the rest of the system depends on —
 * deliberately decoupled from whatever a given provider (Funraisin API today,
 * a different API tomorrow) happens to return. Providers map their raw payloads
 * into these types so ingestion, storage and the UI never change when the
 * upstream source does.
 */

/** A single member of a team. */
export interface ParticipantData {
  /** Stable id from the source platform (string form). */
  sourceId: string;
  /** Vanity slug / page URL fragment, if the source exposes one. */
  slug?: string;
  name: string;
  /** Push-ups completed today (campaign-local day). */
  todayPushUps: number;
  /** Push-ups completed across the whole challenge so far. */
  totalPushUps: number;
  /** Amount raised, in dollars. */
  fundraising: number;
  /** Per-team rank if the source provides one (1 = top). */
  rank?: number;
  /** Profile/avatar image URL, if available. */
  avatarUrl?: string;
  /** True if the participant is still active in the challenge. */
  active?: boolean;
}

/** Aggregate state for a team at the moment of collection. */
export interface TeamData {
  /** Resolved source id (numeric id the API keys on, as a string). */
  sourceId: string;
  /** Vanity slug, e.g. "a23". */
  slug: string;
  name: string;
  totalPushUps: number;
  fundraising: number;
  fundraisingGoal?: number;
  participantCount: number;
  /** Cumulative per-participant push-up target for the whole challenge. */
  challengeTargetPerParticipant?: number;
  /** Global/event rank if exposed by the source. */
  rank?: number;
}

/** Today's campaign-wide push-up target plus the team's progress context. */
export interface ChallengeDayData {
  /** ISO date (yyyy-mm-dd) in the campaign timezone. */
  dayKey: string;
  /** Day number within the challenge (1-based), if known. */
  dayNumber?: number;
  /** Target push-ups per participant for the day. */
  targetPerParticipant: number;
}

/**
 * Everything a provider returns for a single collection run, normalised.
 */
export interface CollectionResult {
  team: TeamData;
  participants: ParticipantData[];
  day: ChallengeDayData | null;
  /** Free-form provenance for debugging (endpoint hit, status, timings). */
  meta: {
    provider: string;
    fetchedAt: string; // ISO timestamp
    notes?: string[];
  };
}

/** Identifies which team a provider should collect. */
export interface TeamTarget {
  /** Internal Firestore team id (we control this). */
  teamId: string;
  /** Source vanity slug, e.g. "a23". */
  slug: string;
  /** Cached resolved source id, if we have already discovered it. */
  resolvedSourceId?: string;
  /** Base URL of the source site. */
  baseUrl: string;
}

export type SyncStatus = 'success' | 'partial' | 'error';

/** Outcome of a single ingestion run, persisted to `syncRuns`. */
export interface SyncRunRecord {
  teamId: string;
  status: SyncStatus;
  provider: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  participantsWritten: number;
  error?: string;
  notes?: string[];
}
