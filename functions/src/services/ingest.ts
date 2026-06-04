import { ChallengeDataProvider, collectWithFallback } from '../scrapers/provider.js';
import { FunraisinPageProvider } from '../scrapers/funraisinPageProvider.js';
import { ScrapeProvider } from '../scrapers/scrapeProvider.js';
import { loadTeamTarget, persistCollection, recordSyncRun } from './firestore.js';
import { logger } from './logger.js';
import type { SyncRunRecord, TeamTarget } from '../types/index.js';

/**
 * Provider chain in priority order. Discovery showed the platform's JSON API is
 * gated, so the primary source is the embedded JSON on the public page; DOM
 * scraping is the last-ditch fallback. A future credentialed API provider would
 * slot in ahead of these without touching ingestion. See docs/DataSourceFindings.md.
 */
export function defaultProviders(): ChallengeDataProvider[] {
  return [new FunraisinPageProvider(), new ScrapeProvider()];
}

/**
 * Collect + persist a single team. Always records a `syncRuns` entry, even on
 * failure, so problems are observable without reading logs.
 */
export async function ingestTeam(
  base: TeamTarget,
  providers: ChallengeDataProvider[] = defaultProviders()
): Promise<SyncRunRecord> {
  const startedAt = new Date();
  const target = await loadTeamTarget(base);
  let record: SyncRunRecord;

  try {
    const result = await collectWithFallback(providers, target, (msg, extra) =>
      logger.info(msg, extra)
    );
    const { participantsWritten } = await persistCollection(target, result);
    const finishedAt = new Date();

    record = {
      teamId: target.teamId,
      status: result.meta.notes?.length ? 'partial' : 'success',
      provider: result.meta.provider,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      participantsWritten,
      notes: result.meta.notes,
    };
    logger.info('Ingest succeeded', {
      teamId: target.teamId,
      provider: result.meta.provider,
      participantsWritten,
      durationMs: record.durationMs,
    });
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    record = {
      teamId: target.teamId,
      status: 'error',
      provider: 'none',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      participantsWritten: 0,
      error: message,
    };
    logger.error('Ingest failed', { teamId: target.teamId, error: message });
  }

  await recordSyncRun(record).catch((e) =>
    logger.error('Failed to record sync run', { error: String(e) })
  );
  return record;
}

/** Ingest every tracked team, isolating failures so one bad team can't block others. */
export async function ingestAll(targets: TeamTarget[]): Promise<SyncRunRecord[]> {
  const results: SyncRunRecord[] = [];
  for (const target of targets) {
    results.push(await ingestTeam(target));
  }
  return results;
}
