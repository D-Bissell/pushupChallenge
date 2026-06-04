# Push-Up Challenge Dashboard

A fast, focused dashboard for [The Push-Up Challenge](https://www.thepushupchallenge.com.au/)
team data. It surfaces the information that matters — team totals, fundraising,
today's target, leaderboards, trends and insights — on a single screen, instead
of the multiple clicks the official site requires.

Built initially for **Team A23**, but architected so additional teams can be
added with a one-line config change.

![status](https://img.shields.io/badge/status-production--ready-brightgreen)

---

## Highlights

- **Public API first.** Data comes from the Funraisin platform's public JSON API
  (The Push-Up Challenge runs on Funraisin). Scraping exists only as an isolated
  fallback behind a provider interface — see
  [`docs/DataSourceFindings.md`](docs/DataSourceFindings.md).
- **Server-side collection.** A scheduled Firebase Function pulls data every 5
  minutes and snapshots it to Firestore. The frontend never scrapes.
- **Historical trends.** Because we snapshot over time, the dashboard shows
  growth, momentum and daily completion that the official site doesn't.
- **Modern SaaS UI.** React + Tailwind + shadcn/ui, dark/light mode, responsive,
  code-split for a fast first load.
- **Demo mode.** With no Firebase config the app runs on bundled sample data, so
  it renders instantly for local dev and previews.

## Tech stack

| Area     | Tech                                                          |
| -------- | ------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Data     | React Query (caching), Firebase Web SDK (Firestore reads)     |
| Backend  | Firebase Functions (Node 22), Firestore (Admin SDK), cheerio  |
| Hosting  | Firebase Hosting                                              |
| CI/CD    | GitHub Actions                                                |
| Quality  | ESLint, Prettier, Vitest                                      |

## Project structure

```
/src                      Frontend
  /components  /components/ui   UI + shadcn primitives
  /pages       Dashboard, Today, Members, Leaderboard, Trends, Insights
  /charts      Recharts components
  /hooks       theme + data hooks (React Query)
  /services    firebase, dataService (read layer), sample data
  /lib         utils, formatting, analytics
  /types       frontend domain types
/functions                Backend (data collection)
  /src/scrapers   provider interface + Funraisin API provider + scrape fallback
  /src/services   http (retry/timeout), firestore, ingest, dates, logger
  /src/types      backend domain types
  /src/__tests__  unit + mapping tests with fixtures
/docs                     Architecture, schema, deployment, troubleshooting, findings
/.github/workflows        PR checks + deploy
```

## Quick start

```bash
# 1. Install
npm install
npm --prefix functions install

# 2. Run the dashboard (demo mode — no Firebase needed)
npm run dev

# 3. (Optional) connect a real Firebase project
cp .env.example .env.local   # fill in VITE_FIREBASE_* values
```

Open http://localhost:5173. Without `.env.local` you'll see the **Demo data**
badge and bundled sample data.

## Scripts

| Command                            | Description                   |
| ---------------------------------- | ----------------------------- |
| `npm run dev`                      | Start the Vite dev server     |
| `npm run build`                    | Type-check + production build |
| `npm test`                         | Run frontend tests (Vitest)   |
| `npm run lint` / `npm run format`  | Lint / format                 |
| `npm --prefix functions run build` | Compile Functions             |
| `npm --prefix functions test`      | Run backend tests             |

## How data flows

```
Funraisin JSON API ──▶ Scheduled Function (every 5 min)
                          │  provider chain: API → scrape fallback
                          ▼
                      Firestore  (current state + time-series snapshots)
                          ▼
                      Dashboard (React Query reads, cached)
```

See [`docs/Architecture.md`](docs/Architecture.md) for the full picture and
[`docs/FirestoreSchema.md`](docs/FirestoreSchema.md) for the data model.

## Deployment

Push to `main` and GitHub Actions builds and deploys Hosting, Firestore rules
and Functions. See [`docs/Deployment.md`](docs/Deployment.md) for the required
secrets and one-time setup.

## Documentation

- [Data source findings](docs/DataSourceFindings.md) — API investigation
- [Architecture](docs/Architecture.md)
- [Firestore schema](docs/FirestoreSchema.md)
- [Deployment](docs/Deployment.md)
- [Troubleshooting](docs/Troubleshooting.md)

## Adding another team

1. Add an entry to `TRACKED_TEAMS` in `functions/src/config.ts`
   (`{ teamId, slug, baseUrl }`).
2. Redeploy Functions. The scheduler picks it up automatically and starts
   snapshotting the new team.
3. Point the dashboard at it with `VITE_DEFAULT_TEAM_ID` (multi-team routing is
   ready to layer on top — query keys are already team-scoped).

## License

MIT. Data belongs to The Push-Up Challenge / Funraisin and the respective
fundraisers; this project is an unofficial viewer.
