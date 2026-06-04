# Troubleshooting

## Dashboard shows "Demo data"

The frontend couldn't find Firebase config, so it's serving bundled sample data.

- **Local:** create `.env.local` from `.env.example` with your `VITE_FIREBASE_*`
  values, then restart `npm run dev`.
- **Deployed:** ensure the `VITE_FIREBASE_*` GitHub secrets are set; they're
  baked in at build time, so re-run the deploy workflow after adding them.

## Dashboard shows "Awaiting first sync"

Firebase is configured but no `syncRuns` exist yet.

- Check the scheduled function ran: `firebase functions:log`.
- Trigger manually:
  ```bash
  curl -X POST "https://<region>-<project>.cloudfunctions.net/manualCollect?team=a23" \
    -H "x-trigger-token: <token>"
  ```

## Status badge shows "Sync failed" / "Degraded"

Open the latest `syncRuns` document or the function logs.

- **`Degraded` (partial):** the API provider hit a snag and a fallback or
  early-pagination note was recorded. Data is present but verify it. Common
  cause: a changed field name — check `notes` and update candidate keys in
  `functions/src/scrapers/funraisinMap.ts`.
- **`Sync failed` (error):** all providers failed. See `error`. Usually:
  - source temporarily down (it will retry next cycle);
  - the slug no longer resolves (see below);
  - network egress blocked (Functions must be on the Blaze plan).

## Slug won't resolve / wrong team

`a23` is a vanity slug, not necessarily the API id. Resolution is cached on
`teams/a23.source.resolvedId`.

- If the source id changed, delete the `source.resolvedId` field (or the whole
  `teams/a23` doc) and let the next run re-resolve.
- To verify the API shape manually:
  ```bash
  curl "https://www.thepushupchallenge.com.au/api/teams/a23?format=json"
  curl "https://www.thepushupchallenge.com.au/api/fundraiser_team_leaderboard/a23/fundraising?format=json"
  ```

## API field names changed

The provider maps multiple candidate keys (`funraisinMap.ts`) and is unit-tested.
If a field stops populating:

1. Log a raw payload (temporarily) or inspect the `curl` output above.
2. Add the new key to the relevant `pick([...])` candidate list.
3. Add a fixture case in `functions/src/__tests__/` and re-run
   `npm --prefix functions test`.

## Charts are empty on Trends

Trends need _history_, which only accrues as snapshots are written every 5 min.
A freshly deployed project will fill in over time. In demo mode, sample history
is included.

`Daily completion %` additionally needs a published daily target
(`currentDay.targetPerParticipant`). If the API doesn't expose it, set the
backstop in `functions/src/config.ts`.

## Firestore "requires an index" error

A query needs a composite index not yet built.

```bash
firebase deploy --only firestore:indexes
```

Indexes can take a few minutes to build; the console shows progress. The error
message also contains a direct "create index" link.

## CI: `npm ci` fails

`npm ci` needs a committed `package-lock.json` in sync with `package.json`. After
changing dependencies, run `npm install` (root and/or `functions/`) and commit
the updated lockfile.

## Local emulators

```bash
npm --prefix functions run build
firebase emulators:start --only functions,firestore
```

Point the app at the emulator by connecting Firestore to `localhost:8080` (add a
`connectFirestoreEmulator` call guarded by an env flag if you want this wired in).

## Lighthouse below 90

- Confirm you're testing the **production** build (`npm run build && npm run
preview`), not the dev server.
- Vendor chunks are split already; if you add heavy deps, keep them out of the
  initial route or lazy-load them.
- Check no oversized images are introduced (avatars are lazy-loaded).
