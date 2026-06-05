# Firestore Schema

All timestamps are Firestore `Timestamp`. Money is stored in dollars (number).
Snapshot collections are nested under their team so rules and queries scope
per-team as more teams are added.

```
teams/{teamId}
  ├─ teamSnapshots/{snapshotId}
  ├─ participants/{participantId}
  ├─ participantSnapshots/{snapshotId}
  └─ fundraisingSnapshots/{snapshotId}
syncRuns/{runId}
config/{document}        # server-only, not client-readable
```

> Snapshot id format: `${dayKey}_${epochMillis}` (and participant snapshots are
> prefixed with the participant id). This makes ids time-sortable and keeps
> writes within a run effectively idempotent.

---

## `teams/{teamId}`

Current aggregate state for a team. One document per team.

| Field                           | Type           | Notes                                                                  |
| ------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `teamId`                        | string         | Internal id (we control), e.g. `a23`.                                  |
| `slug`                          | string         | Source vanity slug, e.g. `a23`.                                        |
| `name`                          | string         | Team display name.                                                     |
| `totalPushUps`                  | number         | Cumulative team push-ups.                                              |
| `fundraising`                   | number         | Total raised (AUD).                                                    |
| `fundraisingGoal`               | number \| null | Goal if published.                                                     |
| `participantCount`              | number         | Active member count.                                                   |
| `challengeTargetPerParticipant` | number \| null | Cumulative per-person push-up target for the whole challenge (3307).   |
| `rank`                          | number \| null | Overall rank if exposed.                                               |
| `currentDay`                    | map \| null    | `{ dayKey, dayNumber, targetPerParticipant }`.                         |
| `source`                        | map            | `{ provider, slug, resolvedId, baseUrl }` — caches slug→id resolution. |
| `updatedAt`                     | Timestamp      | Last successful write.                                                 |

## `teams/{teamId}/teamSnapshots/{snapshotId}`

Time series of team aggregate (drives total/momentum charts).

| Field              | Type           | Notes                                               |
| ------------------ | -------------- | --------------------------------------------------- |
| `teamId`           | string         |                                                     |
| `capturedAt`       | Timestamp      | Collection time. **Indexed** (asc) for range scans. |
| `dayKey`           | string         | `yyyy-mm-dd`, campaign timezone.                    |
| `totalPushUps`     | number         |                                                     |
| `fundraising`      | number         |                                                     |
| `participantCount` | number         |                                                     |
| `rank`             | number \| null |                                                     |

## `teams/{teamId}/participants/{participantId}`

Current per-member state. `participantId` is the source fundraiser id.

| Field           | Type           | Notes                                                                                                                                                                       |
| --------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `participantId` | string         |                                                                                                                                                                             |
| `teamId`        | string         |                                                                                                                                                                             |
| `name`          | string         |                                                                                                                                                                             |
| `slug`          | string \| null |                                                                                                                                                                             |
| `todayPushUps`  | number         | Push-ups today — **derived** (current total − daily baseline).                                                                                                              |
| `totalPushUps`  | number         | Push-ups all-challenge.                                                                                                                                                     |
| `fundraising`   | number         | Raised (AUD).                                                                                                                                                               |
| `rank`          | number \| null | Within-team rank (derived if absent).                                                                                                                                       |
| `avatarUrl`     | string \| null |                                                                                                                                                                             |
| `active`        | boolean        |                                                                                                                                                                             |
| `dayBaseline`   | map            | `{ dayKey, totalAtStart }` — the total at the start of the campaign-local day; rolls over at the day boundary so `todayPushUps` can be computed without a historical query. |
| `updatedAt`     | Timestamp      |                                                                                                                                                                             |

## `teams/{teamId}/participantSnapshots/{snapshotId}`

Time series per member (drives participant progress, biggest mover, most
improved).

| Field           | Type           | Notes                                              |
| --------------- | -------------- | -------------------------------------------------- |
| `participantId` | string         | **Indexed** with `capturedAt`.                     |
| `teamId`        | string         |                                                    |
| `capturedAt`    | Timestamp      |                                                    |
| `dayKey`        | string         | **Indexed** with `capturedAt` (daily aggregation). |
| `todayPushUps`  | number         |                                                    |
| `totalPushUps`  | number         |                                                    |
| `fundraising`   | number         |                                                    |
| `rank`          | number \| null |                                                    |

## `teams/{teamId}/fundraisingSnapshots/{snapshotId}`

A narrow fundraising-only series so the fundraising chart reads minimal data.

| Field         | Type                    |
| ------------- | ----------------------- |
| `teamId`      | string                  |
| `capturedAt`  | Timestamp (indexed asc) |
| `dayKey`      | string                  |
| `fundraising` | number                  |

## `syncRuns/{runId}`

One document per ingestion run, for observability and the UI status badge.

| Field                      | Type                                | Notes                                                              |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `teamId`                   | string                              |                                                                    |
| `status`                   | `'success' \| 'partial' \| 'error'` | `partial` = served with fallback notes.                            |
| `provider`                 | string                              | Which provider succeeded (`funraisin-api`, `html-scrape`, `none`). |
| `startedAt` / `finishedAt` | Timestamp                           |                                                                    |
| `durationMs`               | number                              |                                                                    |
| `participantsWritten`      | number                              |                                                                    |
| `error`                    | string?                             | Present on failure.                                                |
| `notes`                    | string[]?                           | Fallback / pagination notes.                                       |
| `createdAt`                | Timestamp                           | server timestamp                                                   |

## `config/*` (server-only)

Reserved for runtime overrides (e.g. a `config/teams` document overriding
`TRACKED_TEAMS`). **Not** client-readable (rules deny all access).

---

## Indexes

Defined in `firestore.indexes.json`:

| Collection group       | Fields                                | Used by                      |
| ---------------------- | ------------------------------------- | ---------------------------- |
| `participantSnapshots` | `participantId` asc, `capturedAt` asc | per-member trend queries     |
| `participantSnapshots` | `dayKey` asc, `capturedAt` asc        | daily completion aggregation |
| `teamSnapshots`        | `capturedAt` asc                      | team/momentum charts         |
| `participants`         | `active` asc, `totalPushUps` desc     | leaderboard ordering         |

Single-field range queries on `capturedAt` use Firestore's automatic indexes.

## Read-cost notes

- Current-state reads (`teams/{id}`, `participants`) are 1 + N docs and cached 5
  min by React Query.
- Snapshot reads are bounded by the selected date range.
- No realtime listeners — data changes every 5 min, so polling on that cadence is
  far cheaper than live subscriptions.
