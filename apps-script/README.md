# Google Apps Script collector

A free, **Google-hosted** alternative to the GitHub Actions collector.

## Why this exists

The source (`thepushupchallenge.com.au`) sits behind a WAF that intermittently
returns **HTTP 403** to datacenter IPs. GitHub Actions runs on Azure ranges that
get blocked unpredictably — and a single looping run reuses one IP for the whole
hour, so an unlucky IP loses the entire hour (observed: all 11 polls 403'd).

Apps Script's `UrlFetchApp` egresses from **Google's network**, which
`docs/DataSourceFindings.md` recorded as able to reach the host when GitHub/the
build sandbox could not. It also has **native time triggers (1–30 min)** and is
**completely free** (no billing account / no Firebase Blaze).

It writes the **identical Firestore shape** the dashboard already reads
(`teams/{id}`, `teamSnapshots`, `fundraisingSnapshots`, `participants`,
`participantSnapshots`, `syncRuns`), so nothing on the front end changes.

> **This is a parallel collector.** Run it *instead of* the GitHub Actions
> workflow (disable the `collect.yml` schedule) to avoid double-writing
> snapshots. Both can coexist briefly during testing — they're idempotent per
> timestamp, but you'd get two snapshots per tick.

## One-time setup (~5 minutes)

1. **Create the project.** Go to <https://script.google.com> → **New project**.

2. **Add the code.**
   - Replace the contents of `Code.gs` with this folder's `Code.gs`.
   - Show the manifest: **Project Settings** (gear) → tick **Show "appsscript.json"
     manifest file in editor** → open `appsscript.json` in the editor and replace
     it with this folder's `appsscript.json`.

3. **Add the service-account key.**
   - **Project Settings → Script Properties → Add script property**
   - Name: `SERVICE_ACCOUNT_JSON`
   - Value: the **entire contents** of your Firebase service-account key file
     (the same JSON used for the GitHub `FIREBASE_SERVICE_ACCOUNT` secret). It
     must contain `client_email`, `private_key`, and `project_id`.
   - The script authenticates to Firestore with this key, so it needs Firestore
     write access — the existing collector service account already has it.

4. **Prove Google egress works.** In the editor, select `probe` from the function
   dropdown → **Run**. Approve the permission prompt (external requests +
   triggers). Check **Executions** / the log:
   - `probe: HTTP 200, N members parsed` → ✅ Google egress reaches the source.
     Continue.
   - `Blocked (HTTP 403)` → Apps Script IPs are blocked too; stop here and use a
     different option (Cloudflare Workers, etc.).

5. **Test a full write.** Run `collect` once. Confirm the log shows
   `status=success ... participants=N`, and check Firestore (a new `syncRuns`
   doc + updated `teams/a23`).

6. **Schedule it.** Run `setup` once to install the recurring trigger (every
   `TRIGGER_EVERY_MINUTES` minutes — default **15**). Change that constant and
   re-run `setup` to adjust the cadence. (Manage it under the **Triggers** clock
   icon, or run `removeTriggers`.)

7. **Seed the chart rollup (one-off).** Run `backfillRollup` once to build the
   compact `teams/<id>/rollups/series` doc from the snapshot history that already
   exists, so the whole-challenge charts show the days already elapsed. Do this
   after the daily read quota has reset (it reads the snapshot collections once).
   From then on `collect()` keeps the rollup current each run.

8. **Disable the GitHub collector** so snapshots aren't written twice: in the
   repo, comment out the `schedule:` block in `.github/workflows/collect.yml`
   (or disable the workflow in the Actions tab).

> **Why the rollup?** The dashboard's whole-challenge charts read this single
> doc instead of the entire `participantSnapshots` history — which otherwise
> grows every run and blows the free Spark plan's 50k/day read quota once the
> (public) site gets any traffic. `collect()` upserts one point per
> participant/team per day; the doc stays small and is read once per page load.

## Functions

| Function          | Purpose                                                       |
| ----------------- | ------------------------------------------------------------ |
| `probe()`         | One-off egress check — confirms the source returns 200.      |
| `collect()`       | Full collection pass + rollup update (the trigger target).   |
| `backfillRollup()`| One-off: seed the chart rollup from existing snapshots.      |
| `setup()`         | Install the recurring trigger (clears existing first).       |
| `removeTriggers()`| Remove all triggers for this project.                        |

## Notes & limits

- **Quotas (free / consumer account):** `UrlFetchApp` 20,000 calls/day and
  ~90 min of trigger runtime/day. At one short fetch every 15 min (~96/day) this
  is comfortably within limits.
- **Cadence:** Apps Script triggers fire roughly on time, not to-the-second.
  Expect ~15-minute spacing with minor drift.
- **Keeping config in sync:** `DAILY_TARGETS`, `CHALLENGE_START`,
  `TRACKED_TEAMS`, and the parsing logic are copied from `functions/src`. If you
  change them there, update `Code.gs` too. (`scripts/check-appsscript-config.mjs`
  guards the daily-target total.)
- **Optional — `clasp`:** you can manage this folder with
  [`clasp`](https://github.com/google/clasp) (`clasp create`, `clasp push`)
  instead of pasting, if you prefer source control over the live project.
