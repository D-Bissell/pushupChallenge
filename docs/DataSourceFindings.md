# Data Source Findings

**Project:** Push-Up Challenge Dashboard
**Date of investigation:** 2026-06-04
**Target:** https://www.thepushupchallenge.com.au/fundraisers/a23 (Team "A23")

---

## 0. Production verification (2026-06-04) — what actually works

The initial plan assumed Funraisin's public JSON API. **Live probing from GitHub
Actions** (the build sandbox can't reach the host) disproved that for anonymous
access:

| Endpoint | Result |
| -------- | ------ |
| `/api/teams/*`, `/api/topfundraisers/*` | `200` `"Incorrect username or password"` — CRM API, needs HTTP Basic auth. |
| `/api/fundraiser_profile/{id}`, `/api/fundraiser_team_leaderboard/{id}/...` | `403` `{"error":true,"errormessage":"access denied"}` — even with the **real numeric team id** `115773`. |
| `/fundraisers/a23` (the page) | `200`, server-rendered HTML **containing the data**. |

**Conclusion: there is no anonymous JSON API.** The team page, however, embeds the
full member list as a JSON string:

```js
var teamMembers = '[{"name":"…","member_id":"…","total_steps":"172.00",
                     "m_raised":0,"m_username":"…","m_target_steps":"3307"}]';
var members2 = JSON.parse(teamMembers);
```

- `total_steps` → **push-ups**; `m_raised` → **dollars raised**; `m_username` →
  profile slug; `m_target_steps` → cumulative challenge target.
- Numeric team id is leaked in `/team/{id}` URLs; team name from `<title>`; team
  rank from "currently ranked N" text.

**Implemented source:** `FunraisinPageProvider` fetches the page and parses that
embedded JSON (one request/run, no brittle DOM selectors). The gated-API provider
is retained for a future credentialed path; DOM scraping remains the last-ditch
fallback. The provider interface meant this pivot touched only the providers —
ingestion, schema and UI were unchanged. Parsing is pure + unit-tested
(`funraisinPage.test.ts`).

> Note: a single page fetch exposes only **cumulative** totals, so per-member
> `todayPushUps` is recorded as 0 and "today" figures are derived from snapshot
> diffs over time.

The sections below capture the original investigation for context.

---

## 1. Summary

The Push-Up Challenge website is **built on the [Funraisin](https://www.funraisin.co/)
fundraising platform** (confirmed: The Push-Up Challenge was Funraisin's published
["Site of the Month"](https://www.funraisin.co/blog/sotm-pushups)).

Funraisin ships a **documented, public, read-only JSON API** mounted at
`/api/<endpoint>` on each customer's own domain. This means data for Team A23 is
available from:

```
https://www.thepushupchallenge.com.au/api/<endpoint>?format=json
```

**Decision:** We use the **public JSON API** (priority #1 in the brief). Scraping of
rendered HTML is implemented only as a _fallback_ and is isolated behind a provider
interface so it can be swapped without touching the rest of the system.

---

## 2. Investigation method

| Step | Action                                               | Result                                                                                                                                                                                                               |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Direct fetch of the team page from the build sandbox | `403` / host not in the sandbox network allowlist. The sandbox cannot reach the live site; **Firebase Functions running in Google Cloud can** — this is the architectural reason all collection happens server-side. |
| 2    | Web search for an official API                       | Surfaced Funraisin's developer docs (`support.funraisin.co/developers`).                                                                                                                                             |
| 3    | Identify platform                                    | Confirmed The Push-Up Challenge runs on Funraisin.                                                                                                                                                                   |
| 4    | Map Funraisin API surface                            | Documented endpoints, parameters, and response envelope (below).                                                                                                                                                     |

> ⚠️ Because the live host is not reachable from the build sandbox, the exact field
> names returned for _this_ campaign could not be byte-verified here. The provider is
> therefore written defensively (tolerant field mapping + a scraping fallback) and the
> Function logs the raw shape on first run so the mapping can be confirmed in
> production. See `functions/src/scrapers/funraisinApiProvider.ts`.

---

## 3. Funraisin public API

### Base

```
https://www.thepushupchallenge.com.au/api/<endpoint>
```

### Common conventions

- `?format=json` — return JSON (default is CSV).
- `date_from` / `date_to` — `yyyy-mm-dd` range filters (on dated endpoints).
- `limit`, `offset` — pagination (many endpoints page at 50; responses include
  `nextpage` / `prevpage` offset helpers).
- Response envelope:

  ```jsonc
  {
    "results": 123, // total records available
    "data": [
      /* ... */
    ], // the records
    "nextpage": 50, // optional
    "prevpage": null, // optional
  }
  ```

- **No authentication / API key** is required for the public read endpoints used here.

### Endpoints relevant to this dashboard

| Endpoint           | Pattern                                                  | Purpose                                                      |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| Team               | `/api/teams/{team_id}`                                   | Single team record (name, totals, member count).             |
| Teams              | `/api/teams`                                             | List of teams (future multi-team support).                   |
| Team leaderboard   | `/api/fundraiser_team_leaderboard/{team_id}/fundraising` | Members of a team ranked by fundraising.                     |
| Fundraiser profile | `/api/fundraiser_profile/{event_id}`                     | Individual fundraiser profile (push-up totals, fundraising). |
| Top fundraisers    | `/api/topfundraisers/{limit}/{event_id}`                 | Leaderboard of top fundraisers.                              |
| Donations          | `/api/donations`                                         | Donation records (supports `date_from`/`date_to`).           |

### The `a23` slug

`/fundraisers/a23` is a **vanity slug**, not necessarily the numeric `team_id`/`event_id`
the API keys on. The collector resolves the slug → id once and caches the resolved id on
the `teams/{teamId}` document (`source.slug`, `source.resolvedId`). Resolution strategy,
in order:

1. Treat the slug as an id against `/api/teams/{slug}` and `/api/fundraiser_profile/{slug}`.
2. If that fails, fetch the public page HTML and extract the embedded id
   (Funraisin pages embed page/team ids in `data-*` attributes and inline JSON).

This keeps slug→id resolution as the _only_ place that may touch HTML.

---

## 4. Data obtainable

From the endpoints above we can populate every metric the dashboard needs:

- **Team:** name, fundraising total, push-up total, participant count, rank (where the
  platform exposes it).
- **Participants:** name, push-ups (today + total), fundraising amount, per-member rank.
- **Fundraising:** running totals (for trend snapshots) and donation events.
- **Today's target:** The Push-Up Challenge publishes a **daily push-up target** for the
  June campaign (the target changes daily to reflect suicide statistics). This is read
  from the campaign/challenge metadata; if not present in the API response it is derived
  from the published target schedule and stored on the `challengeDays` config.

Historical trends are produced **by us** by snapshotting these values every 5 minutes
into Firestore (the platform API returns current state, not history).

---

## 5. Provider strategy (priority order honoured)

```
FunraisinApiProvider   (priority 1 — public JSON API)  ← default
        │  on hard failure / shape mismatch
        ▼
ScrapeProvider         (priority 4 — HTML fallback)    ← defensive only
```

Both implement the same `ChallengeDataProvider` interface
(`functions/src/scrapers/provider.ts`). If Funraisin (or the campaign) later offers a
cleaner official API, only a new provider class is added — ingestion, schema, and UI are
untouched. This satisfies the brief's "isolate scraping behind a provider interface"
requirement.

---

## 6. Risks & assumptions

| Risk                                           | Mitigation                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Exact JSON field names unverified from sandbox | Tolerant field mapping; first-run shape logged; scraping fallback.                               |
| Slug ≠ id                                      | One-time slug resolution, cached on team doc.                                                    |
| Endpoint shape changes                         | Provider interface + fallback + `syncRuns` error reporting + alerting hook.                      |
| Rate limiting                                  | 5-minute cadence, single team, conditional requests, exponential-backoff retry, request timeout. |
| Daily target not in API                        | Configurable `challengeDays` target table as backstop.                                           |

---

## 7. Sources

- Funraisin Developer docs — https://support.funraisin.co/developers/funraisin-api
- Funraisin Fundraiser API — https://support.funraisin.co/blog/fundraiser-api
- Funraisin Data Structure — https://support.funraisin.co/developers/data-structure
- The Push-Up Challenge on Funraisin (Site of the Month) — https://www.funraisin.co/blog/sotm-pushups
