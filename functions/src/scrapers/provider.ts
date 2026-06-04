import type { CollectionResult, TeamTarget } from '../types/index.js';

/**
 * The single seam between "how we get the data" and "everything else".
 *
 * Every data source — the Funraisin public JSON API today, a hypothetical
 * official Push-Up Challenge API tomorrow, or an HTML-scraping fallback — is
 * expressed as a `ChallengeDataProvider`. Ingestion depends only on this
 * interface, so replacing the source is a one-class change.
 */
export interface ChallengeDataProvider {
  /** Human-readable id used in logs and the `syncRuns` provenance. */
  readonly name: string;

  /**
   * Collect a normalised snapshot for the given team.
   *
   * Implementations must:
   *  - apply their own per-request timeout + retry policy (see `services/http`);
   *  - throw a `ProviderError` on unrecoverable failure so the caller can fall
   *    back to the next provider in the chain.
   */
  collect(target: TeamTarget): Promise<CollectionResult>;
}

/** Thrown by providers on unrecoverable failure. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Runs providers in priority order, returning the first success. Mirrors the
 * brief's priority list: public API → JSON endpoints → embedded data → scraping.
 */
export async function collectWithFallback(
  providers: ChallengeDataProvider[],
  target: TeamTarget,
  log: (msg: string, extra?: Record<string, unknown>) => void
): Promise<CollectionResult> {
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      log(`Collecting via ${provider.name}`, { provider: provider.name });
      const result = await provider.collect(target);
      if (errors.length) {
        result.meta.notes = [...(result.meta.notes ?? []), ...errors];
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.name} failed: ${message}`);
      log(`Provider ${provider.name} failed, trying next`, { error: message });
    }
  }
  throw new ProviderError(`All providers failed: ${errors.join('; ')}`, 'fallback-chain');
}
