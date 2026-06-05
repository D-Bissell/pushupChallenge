import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import type { CollectionResult, SyncRunRecord, TeamTarget } from '../types/index.js';
import { computeTodayPushUps, type DayBaseline } from './daily.js';

if (!getApps().length) initializeApp();

export const db = getFirestore();

/**
 * Collection layout (see docs/FirestoreSchema.md):
 *   teams/{teamId}
 *     ├─ teamSnapshots/{ts}
 *     ├─ participants/{participantId}
 *     ├─ participantSnapshots/{ts}
 *     └─ fundraisingSnapshots/{ts}
 *   syncRuns/{runId}
 *
 * Snapshots are nested under their team so security rules and queries scope
 * cleanly per team as more teams are added.
 */
const teamDoc = (teamId: string) => db.collection('teams').doc(teamId);

/**
 * Persist a collection result: updates current state and appends time-series
 * snapshots. All writes go through a batch for atomicity per run.
 */
export async function persistCollection(
  target: TeamTarget,
  result: CollectionResult
): Promise<{ participantsWritten: number }> {
  const now = Timestamp.now();
  const capturedAt = now;
  const dayKey = result.day?.dayKey ?? new Date().toISOString().slice(0, 10);
  const team = teamDoc(target.teamId);

  // Snapshot id is time-ordered so range scans are cheap and idempotent-ish.
  const snapId = `${dayKey}_${now.toMillis()}`;

  const batch = db.batch();

  // 1. Current team state (merge to preserve fields like source metadata).
  batch.set(
    team,
    {
      teamId: target.teamId,
      slug: result.team.slug,
      name: result.team.name,
      totalPushUps: result.team.totalPushUps,
      fundraising: result.team.fundraising,
      fundraisingGoal: result.team.fundraisingGoal ?? null,
      participantCount: result.team.participantCount,
      challengeTargetPerParticipant: result.team.challengeTargetPerParticipant ?? null,
      rank: result.team.rank ?? null,
      source: {
        provider: result.meta.provider,
        slug: result.team.slug,
        resolvedId: result.team.sourceId,
        baseUrl: target.baseUrl,
      },
      currentDay: result.day
        ? {
            dayKey: result.day.dayKey,
            dayNumber: result.day.dayNumber ?? null,
            targetPerParticipant: result.day.targetPerParticipant,
          }
        : null,
      updatedAt: capturedAt,
    },
    { merge: true }
  );

  // 2. Team time-series snapshot.
  batch.set(team.collection('teamSnapshots').doc(snapId), {
    teamId: target.teamId,
    capturedAt,
    dayKey,
    totalPushUps: result.team.totalPushUps,
    fundraising: result.team.fundraising,
    participantCount: result.team.participantCount,
    rank: result.team.rank ?? null,
  });

  // 3. Fundraising-only snapshot (cheap to query for the fundraising chart).
  batch.set(team.collection('fundraisingSnapshots').doc(snapId), {
    teamId: target.teamId,
    capturedAt,
    dayKey,
    fundraising: result.team.fundraising,
  });

  // 4. Per-participant current state + per-participant snapshot.
  //    Read existing participant docs once so we can derive "today" push-ups
  //    from a stored daily baseline (one collection read, no composite index).
  const existingSnap = await team.collection('participants').get();
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data()]));

  for (const p of result.participants) {
    const pid = p.sourceId;
    const prev = existing.get(pid);
    const { todayPushUps, baseline } = computeTodayPushUps({
      currentTotal: p.totalPushUps,
      prevTotal: typeof prev?.totalPushUps === 'number' ? prev.totalPushUps : undefined,
      prevBaseline: prev?.dayBaseline as DayBaseline | undefined,
      dayKey,
    });

    batch.set(
      team.collection('participants').doc(pid),
      {
        participantId: pid,
        teamId: target.teamId,
        name: p.name,
        slug: p.slug ?? null,
        todayPushUps,
        totalPushUps: p.totalPushUps,
        fundraising: p.fundraising,
        rank: p.rank ?? null,
        avatarUrl: p.avatarUrl ?? null,
        active: p.active ?? true,
        dayBaseline: baseline,
        updatedAt: capturedAt,
      },
      { merge: true }
    );

    batch.set(team.collection('participantSnapshots').doc(`${pid}_${snapId}`), {
      participantId: pid,
      teamId: target.teamId,
      capturedAt,
      dayKey,
      todayPushUps,
      totalPushUps: p.totalPushUps,
      fundraising: p.fundraising,
      rank: p.rank ?? null,
    });
  }

  await batch.commit();
  return { participantsWritten: result.participants.length };
}

/** Load a tracked team's cached source metadata to skip slug re-resolution. */
export async function loadTeamTarget(base: TeamTarget): Promise<TeamTarget> {
  const snap = await teamDoc(base.teamId).get();
  const data = snap.data();
  const resolvedId = data?.source?.resolvedId as string | undefined;
  return resolvedId ? { ...base, resolvedSourceId: resolvedId } : base;
}

/** Record the outcome of a sync run for observability and the UI status badge. */
export async function recordSyncRun(run: SyncRunRecord): Promise<void> {
  await db.collection('syncRuns').add({
    ...run,
    startedAt: Timestamp.fromDate(new Date(run.startedAt)),
    finishedAt: Timestamp.fromDate(new Date(run.finishedAt)),
    createdAt: FieldValue.serverTimestamp(),
  });
}
