# Architecture

## Overview

The system has three cleanly separated tiers:

1. **Collection (backend)** — Firebase Functions fetch data from the source and
   write normalised snapshots to Firestore.
2. **Storage** — Firestore holds current state plus time-series snapshots.
3. **Presentation (frontend)** — a React SPA reads Firestore (cached via React
   Query) and renders the dashboard.

```
┌─────────────────────────┐
│  The Push-Up Challenge   │  (Funraisin platform)
│  /api/* public JSON      │
└────────────┬────────────┘
             │ HTTPS (server-side only)
             ▼
┌─────────────────────────────────────────────┐
│  Firebase Functions                          │
│  • scheduledCollect  (every 5 min)           │
│  • manualCollect     (token-protected HTTP)  │
│                                              │
│  ingest() ─▶ provider chain ─▶ persist()     │
│              1. FunraisinApiProvider         │
│              2. ScrapeProvider (fallback)    │
└────────────┬─────────────────────────────────┘
             │ Admin SDK writes (bypass rules)
             ▼
┌─────────────────────────────────────────────┐
│  Firestore                                   │
│  teams/{id}                                  │
│    ├ teamSnapshots/        (time series)     │
│    ├ participants/         (current)         │
│    ├ participantSnapshots/ (time series)     │
│    └ fundraisingSnapshots/ (time series)     │
│  syncRuns/                 (observability)   │
│  config/                   (server-only)     │
└────────────┬─────────────────────────────────┘
             │ read-only (public rules)
             ▼
┌─────────────────────────────────────────────┐
│  React SPA (Firebase Hosting)                │
│  React Query cache ─▶ pages + charts         │
└─────────────────────────────────────────────┘
```

## Key design decisions

### Provider interface (the critical seam)

All data acquisition implements `ChallengeDataProvider`
(`functions/src/scrapers/provider.ts`):

```ts
interface ChallengeDataProvider {
  readonly name: string;
  collect(target: TeamTarget): Promise<CollectionResult>;
}
```

`collectWithFallback()` runs providers in the brief's priority order — public API
first, scraping last — returning the first success and recording fallbacks as
notes. **Consequences:**

- Scraping is quarantined: only `ScrapeProvider` touches HTML.
- A future official API is a new class; ingestion, schema and UI are untouched.
- Field-mapping logic (`funraisinMap.ts`) is pure and unit-tested against
  fixtures, tolerant of upstream field renames.

### Server-side only collection

The frontend never calls the source. This keeps any scraping/credentials/IP
reputation server-side, lets us add caching and rate-limiting in one place, and
keeps the client bundle small and safe.

### Snapshots for history

The source API returns _current_ state. To enable trends we snapshot every 5
minutes into time-series subcollections. Current-state docs (`teams/{id}`,
`participants/{id}`) are also maintained for cheap "right now" reads.

### Resilience

`services/http.ts` wraps `fetch` with per-attempt **timeout**, **exponential
backoff retry** (on network errors, timeouts, 429/5xx), and a polite User-Agent.
Each run writes a `syncRuns` record (`success | partial | error`) so health is
observable without log diving; the scheduler throws on failure so Cloud
Monitoring alerts can fire.

### Frontend data layer

`services/dataService.ts` is the single read seam. It returns bundled sample data
when Firebase isn't configured ("demo mode"), otherwise reads Firestore.
`hooks/useChallengeData.ts` wraps these in React Query with a 5-minute
`staleTime`/`refetchInterval` to **minimise Firestore reads** (one fetch per
query per window, shared across components, no realtime listeners).

## Performance

- **Code splitting** — vendor chunks (react, charts, firebase, query) are split
  so the initial route stays light (see `vite.config.ts`).
- **Fixed chart heights** to avoid layout shift (CLS).
- **Immutable caching** of hashed assets + `no-cache` on `index.html`
  (`firebase.json`).
- **Lazy images**, `tabular-nums` for stable number columns, reduced-motion
  support.

## Frontend module map

| Layer            | Responsibility                                                     |
| ---------------- | ------------------------------------------------------------------ |
| `pages/`         | Route-level composition only                                       |
| `components/`    | Reusable presentational pieces (KpiCard, Avatar, SyncStatusBadge…) |
| `components/ui/` | shadcn/ui primitives                                               |
| `charts/`        | Recharts wrappers + a shared theme                                 |
| `hooks/`         | Theme context + data hooks                                         |
| `services/`      | Firebase init, read layer, sample data                             |
| `lib/`           | Pure helpers: `format`, `analytics`, `utils`                       |

Pure logic lives in `lib/` and `functions/src/scrapers/funraisinMap.ts` so it can
be tested without React, Firestore, or the network.

## Security posture

- Public, read-only dashboard. All writes are Admin-SDK only (rules deny client
  writes). See `firestore.rules`.
- `manualCollect` is protected by a shared secret to prevent abuse.
- Designed for auth later: rule helpers (`isSignedIn`) are stubbed in, and the
  `config/` collection is already client-invisible. See
  [Deployment](Deployment.md#future-authentication).
