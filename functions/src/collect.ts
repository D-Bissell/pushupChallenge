/**
 * Standalone collector entry point.
 *
 * Runs one full collection pass for every tracked team and exits. This is what
 * the GitHub Actions "Collect Data" workflow runs on a schedule, letting the
 * whole pipeline operate on Firebase's free (Spark) plan — Cloud Functions
 * (which require Blaze) are not involved.
 *
 * Authentication is via Application Default Credentials: the workflow writes the
 * service-account key to a file and points GOOGLE_APPLICATION_CREDENTIALS at it,
 * which firebase-admin's initializeApp() picks up automatically.
 *
 * Run locally with:
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json GOOGLE_CLOUD_PROJECT=pushup-fdef2 \
 *     node lib/collect.js
 */
import { ingestAll } from './services/ingest.js';
import { TRACKED_TEAMS } from './config.js';

async function main(): Promise<void> {
  const startedAt = Date.now();
  const runs = await ingestAll(TRACKED_TEAMS);

  for (const r of runs) {
    const summary =
      `team=${r.teamId} status=${r.status} provider=${r.provider} ` +
      `participants=${r.participantsWritten} duration=${r.durationMs}ms`;
    if (r.status === 'error') console.error(`[collect] ${summary} error=${r.error ?? ''}`);
    else console.log(`[collect] ${summary}`);
  }

  const failed = runs.filter((r) => r.status === 'error');
  console.log(
    `[collect] finished: ${runs.length - failed.length}/${runs.length} ok in ` +
      `${Date.now() - startedAt}ms`
  );

  // Non-zero exit marks the workflow run red so failures are visible.
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('[collect] fatal error', err);
  process.exit(1);
});
