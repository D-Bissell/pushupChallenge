# Deployment

## Prerequisites

- A Firebase project on the **Blaze (pay-as-you-go)** plan (required for
  scheduled Functions and outbound network calls).
- Firebase CLI: `npm i -g firebase-tools`.
- Node 22.

## One-time setup

```bash
firebase login
firebase use --add            # select your project, alias it "default"
```

Update `.firebaserc` if your project id differs from `pushup-challenge-dashboard`.

### Enable services

In the Firebase console enable: **Firestore**, **Functions**, **Hosting**, and
**Cloud Scheduler** (prompted on first scheduled-function deploy).

### Create the manual-trigger secret

```bash
firebase functions:secrets:set COLLECT_TRIGGER_TOKEN
# paste a long random string
```

This protects the `manualCollect` HTTP endpoint from abuse.

## Manual deploy

```bash
# Build both
npm ci && npm run build
npm --prefix functions ci && npm --prefix functions run build

# Deploy
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
firebase deploy --only hosting
# …or all at once:
firebase deploy
```

After the first Functions deploy, confirm the schedule:

```bash
gcloud scheduler jobs list           # should list the every-5-min job
firebase functions:log               # watch collection runs
```

Trigger a collection on demand:

```bash
curl -X POST "https://<region>-<project>.cloudfunctions.net/manualCollect?team=a23" \
  -H "x-trigger-token: <COLLECT_TRIGGER_TOKEN>"
```

## Continuous deployment (GitHub Actions)

- **`.github/workflows/pr.yml`** — on PRs to `main`: lint, typecheck, test and
  build for both the frontend and functions.
- **`.github/workflows/deploy.yml`** — on push to `main`: build both, then
  `firebase deploy --only hosting,firestore,functions`.

### Required GitHub secrets

| Secret                              | Purpose                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT`          | JSON key of a service account used to deploy (see roles below). |
| `FIREBASE_PROJECT_ID`               | Your Firebase project id.                                       |
| `VITE_FIREBASE_API_KEY`             | Web app config (public).                                        |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Web app config.                                                 |
| `VITE_FIREBASE_PROJECT_ID`          | Web app config.                                                 |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Web app config.                                                 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Web app config.                                                 |
| `VITE_FIREBASE_APP_ID`              | Web app config.                                                 |

Optional repo **variable**: `VITE_DEFAULT_TEAM_ID` (defaults to `a23`).

> The `VITE_FIREBASE_*` values are _public by design_ — they identify the
> project, they don't grant write access (Firestore rules do). Keeping them as
> secrets simply avoids committing project-specific config.

### Service account roles

Create a service account and grant:

- **Firebase Admin** (`roles/firebase.admin`)
- **Cloud Functions Admin** (`roles/cloudfunctions.admin`)
- **Service Account User** (`roles/iam.serviceAccountUser`)
- **Cloud Scheduler Admin** (`roles/cloudscheduler.admin`) — for the schedule

Download the JSON key and store it as the `FIREBASE_SERVICE_ACCOUNT` secret.

### Getting the web config

Firebase console → Project settings → _Your apps_ → Web app → "SDK setup and
configuration" → copy the values into the `VITE_FIREBASE_*` secrets.

## Verifying a deploy

1. Visit your Hosting URL — the status badge should read **Live** (not "Demo
   data") once the first sync completes.
2. `firebase functions:log` shows `Ingest succeeded`.
3. Firestore has `teams/a23` plus growing snapshot subcollections and `syncRuns`.

## Region & cost

- Functions and Firestore default to `australia-southeast1` (close to the
  source/audience). Change in `functions/src/index.ts` (`setGlobalOptions`) if
  needed.
- At 5-minute cadence for one team the workload sits comfortably in free-tier
  quotas; Blaze is required for capability, not because of expected cost.

## Future authentication

The architecture is auth-ready:

1. Enable Firebase Auth, add the SDK and a sign-in flow.
2. In `firestore.rules`, switch the relevant `allow read: if true;` lines to
   `allow read: if isSignedIn();` (helper already present) or a custom-claim
   check for admin-only collections.
3. No backend changes needed — writes are already Admin-SDK only.
