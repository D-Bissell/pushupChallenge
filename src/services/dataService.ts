/**
 * The single read-side data access layer. Everything the UI needs comes from
 * here. When Firebase is configured it reads Firestore; otherwise it serves
 * bundled sample data so the app is never blank.
 *
 * Reads are minimised: documents are fetched once per query and cached by
 * React Query (see hooks). We use one-shot `getDocs` rather than realtime
 * listeners because the data only changes every 5 minutes.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  where,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from './firebase';
import type {
  Team,
  Participant,
  TeamSnapshot,
  FundraisingSnapshot,
  ParticipantSnapshot,
  SyncRun,
  DateRange,
} from '@/types';
import {
  sampleTeam,
  sampleParticipants,
  sampleTeamSnapshots,
  sampleFundraisingSnapshots,
  sampleParticipantSnapshots,
  sampleSyncRun,
} from './sampleData';

export const isDemoMode = () => getDb() === null;

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return null;
}

function teamRef(teamId: string) {
  const db = getDb();
  if (!db) throw new Error('Firestore not configured');
  return doc(db, 'teams', teamId);
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
export async function fetchTeam(teamId: string): Promise<Team | null> {
  if (isDemoMode()) return sampleTeam;
  const snap = await getDoc(teamRef(teamId));
  if (!snap.exists()) return null;
  return mapTeam(snap.id, snap.data());
}

function mapTeam(id: string, d: DocumentData): Team {
  return {
    teamId: id,
    slug: d.slug ?? id,
    name: d.name ?? 'Unknown Team',
    totalPushUps: d.totalPushUps ?? 0,
    fundraising: d.fundraising ?? 0,
    fundraisingGoal: d.fundraisingGoal ?? null,
    participantCount: d.participantCount ?? 0,
    rank: d.rank ?? null,
    currentDay: d.currentDay
      ? {
          dayKey: d.currentDay.dayKey,
          dayNumber: d.currentDay.dayNumber ?? null,
          targetPerParticipant: d.currentDay.targetPerParticipant ?? 0,
        }
      : null,
    updatedAt: toDate(d.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------
export async function fetchParticipants(teamId: string): Promise<Participant[]> {
  if (isDemoMode()) return sampleParticipants;
  const snap = await getDocs(collection(teamRef(teamId), 'participants'));
  return snap.docs.map((doc) => mapParticipant(doc.id, doc.data()));
}

function mapParticipant(id: string, d: DocumentData): Participant {
  return {
    participantId: id,
    teamId: d.teamId,
    name: d.name ?? 'Unknown',
    slug: d.slug ?? null,
    todayPushUps: d.todayPushUps ?? 0,
    totalPushUps: d.totalPushUps ?? 0,
    fundraising: d.fundraising ?? 0,
    rank: d.rank ?? null,
    avatarUrl: d.avatarUrl ?? null,
    active: d.active ?? true,
    updatedAt: toDate(d.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Snapshots (time series)
// ---------------------------------------------------------------------------
export async function fetchTeamSnapshots(
  teamId: string,
  range?: DateRange
): Promise<TeamSnapshot[]> {
  if (isDemoMode()) return filterByRange(sampleTeamSnapshots, range);
  const base = collection(teamRef(teamId), 'teamSnapshots');
  const snap = await getDocs(rangedQuery(base, range));
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      capturedAt: toDate(d.capturedAt) ?? new Date(),
      dayKey: d.dayKey,
      totalPushUps: d.totalPushUps ?? 0,
      fundraising: d.fundraising ?? 0,
      participantCount: d.participantCount ?? 0,
      rank: d.rank ?? null,
    };
  });
}

export async function fetchFundraisingSnapshots(
  teamId: string,
  range?: DateRange
): Promise<FundraisingSnapshot[]> {
  if (isDemoMode()) return filterByRange(sampleFundraisingSnapshots, range);
  const base = collection(teamRef(teamId), 'fundraisingSnapshots');
  const snap = await getDocs(rangedQuery(base, range));
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      capturedAt: toDate(d.capturedAt) ?? new Date(),
      dayKey: d.dayKey,
      fundraising: d.fundraising ?? 0,
    };
  });
}

export async function fetchParticipantSnapshots(
  teamId: string,
  range?: DateRange
): Promise<ParticipantSnapshot[]> {
  if (isDemoMode()) return filterByRange(sampleParticipantSnapshots, range);
  const base = collection(teamRef(teamId), 'participantSnapshots');
  const snap = await getDocs(rangedQuery(base, range));
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      participantId: d.participantId,
      capturedAt: toDate(d.capturedAt) ?? new Date(),
      dayKey: d.dayKey,
      todayPushUps: d.todayPushUps ?? 0,
      totalPushUps: d.totalPushUps ?? 0,
      fundraising: d.fundraising ?? 0,
      rank: d.rank ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Sync status
// ---------------------------------------------------------------------------
export async function fetchLatestSyncRun(teamId: string): Promise<SyncRun | null> {
  if (isDemoMode()) return sampleSyncRun;
  const db = getDb();
  if (!db) return null;
  // Order by a single field (auto-indexed) and filter by team client-side, so
  // this needs no composite index — important because Firestore indexes are not
  // auto-deployed on the free/browser setup.
  const q = query(collection(db, 'syncRuns'), orderBy('finishedAt', 'desc'), fbLimit(25));
  const snap = await getDocs(q);
  const match = snap.docs.find((doc) => doc.data().teamId === teamId);
  if (!match) return null;
  const d = match.data();
  return {
    teamId: d.teamId,
    status: d.status,
    provider: d.provider,
    finishedAt: toDate(d.finishedAt),
    durationMs: d.durationMs ?? 0,
    participantsWritten: d.participantsWritten ?? 0,
    error: d.error,
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function rangedQuery(base: ReturnType<typeof collection>, range?: DateRange) {
  if (range) {
    return query(
      base,
      where('capturedAt', '>=', Timestamp.fromDate(range.from)),
      where('capturedAt', '<=', Timestamp.fromDate(range.to)),
      orderBy('capturedAt', 'asc')
    );
  }
  return query(base, orderBy('capturedAt', 'asc'));
}

function filterByRange<T extends { capturedAt: Date }>(items: T[], range?: DateRange): T[] {
  if (!range) return items;
  return items.filter((i) => i.capturedAt >= range.from && i.capturedAt <= range.to);
}
