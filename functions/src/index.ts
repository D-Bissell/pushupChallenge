import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { ingestAll, ingestTeam } from './services/ingest.js';
import { TRACKED_TEAMS, CAMPAIGN_TIMEZONE } from './config.js';
import { logger } from './services/logger.js';

// Conservative defaults: small instances, capped concurrency, sane timeout.
setGlobalOptions({
  region: 'australia-southeast1',
  memory: '512MiB',
  timeoutSeconds: 120,
  maxInstances: 3,
});

/**
 * Scheduled collector — runs every 5 minutes. Pulls the latest data for every
 * tracked team and writes snapshots to Firestore.
 */
export const scheduledCollect = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: CAMPAIGN_TIMEZONE,
    retryCount: 1,
  },
  async () => {
    logger.info('Scheduled collection starting', { teams: TRACKED_TEAMS.length });
    const runs = await ingestAll(TRACKED_TEAMS);
    const failed = runs.filter((r) => r.status === 'error');
    logger.info('Scheduled collection finished', {
      total: runs.length,
      failed: failed.length,
    });
    if (failed.length) {
      // Surface as a thrown error so Cloud Scheduler marks the run failed and
      // alerting policies can fire.
      throw new Error(`${failed.length}/${runs.length} team ingests failed`);
    }
  }
);

/**
 * Manual trigger for operators — protected by a shared secret so the endpoint
 * cannot be abused to hammer the upstream source. Set the secret with:
 *   firebase functions:secrets:set COLLECT_TRIGGER_TOKEN
 *
 * Usage: POST /manualCollect?team=a23  with header  x-trigger-token: <token>
 */
export const manualCollect = onRequest(
  { secrets: ['COLLECT_TRIGGER_TOKEN'], cors: false },
  async (req, res) => {
    const expected = process.env.COLLECT_TRIGGER_TOKEN;
    const provided = req.get('x-trigger-token');
    if (!expected || provided !== expected) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const slug = (req.query.team as string) || undefined;
    const targets = slug ? TRACKED_TEAMS.filter((t) => t.slug === slug) : TRACKED_TEAMS;
    if (!targets.length) {
      res.status(404).json({ error: `unknown team: ${slug}` });
      return;
    }

    const runs = [];
    for (const t of targets) runs.push(await ingestTeam(t));
    res.status(200).json({ runs });
  }
);
