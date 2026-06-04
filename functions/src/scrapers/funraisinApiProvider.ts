import { ChallengeDataProvider, ProviderError } from './provider.js';
import type { CollectionResult, TeamTarget, ChallengeDayData } from '../types/index.js';
import { fetchJson } from '../services/http.js';
import { logger } from '../services/logger.js';
import { COLLECTION } from '../config.js';
import { CAMPAIGN_TIMEZONE } from '../config.js';
import { dayKeyInTimeZone, challengeDayNumber } from '../services/dates.js';
import {
  mapTeam,
  mapParticipant,
  unwrapData,
  ensureRanks,
  pick,
  toNumber,
  toStringId,
} from './funraisinMap.js';

/**
 * Priority #1 source: the Funraisin public JSON API.
 *
 * Funraisin (the platform behind The Push-Up Challenge) exposes read-only JSON
 * at `/api/<endpoint>?format=json`. See docs/DataSourceFindings.md for the full
 * endpoint map. All field access is tolerant (multiple candidate keys) because
 * the exact payload shape for this campaign can only be confirmed in production.
 */
export class FunraisinApiProvider implements ChallengeDataProvider {
  readonly name = 'funraisin-api';

  private opts = {
    timeoutMs: COLLECTION.timeoutMs,
    retries: COLLECTION.retries,
    backoffBaseMs: COLLECTION.backoffBaseMs,
    headers: { Accept: 'application/json' },
  };

  async collect(target: TeamTarget): Promise<CollectionResult> {
    const notes: string[] = [];
    const sourceId = await this.resolveSourceId(target, notes);

    const teamRaw = await this.fetchTeam(target.baseUrl, sourceId);
    const team = mapTeam(teamRaw, target.slug);
    team.sourceId = sourceId;

    const participants = ensureRanks(await this.fetchParticipants(target.baseUrl, sourceId, notes));

    // Keep participant count truthful even if the team endpoint omitted it.
    if (!team.participantCount && participants.length) {
      team.participantCount = participants.length;
    }
    // Derive team total push-ups from members if the team endpoint omitted it.
    if (!team.totalPushUps && participants.length) {
      team.totalPushUps = participants.reduce((sum, p) => sum + p.totalPushUps, 0);
    }

    const day = this.deriveDay(teamRaw);

    return {
      team,
      participants,
      day,
      meta: { provider: this.name, fetchedAt: new Date().toISOString(), notes },
    };
  }

  /** Resolve a vanity slug (e.g. "a23") to the numeric source id the API keys on. */
  private async resolveSourceId(target: TeamTarget, notes: string[]): Promise<string> {
    if (target.resolvedSourceId) return target.resolvedSourceId;

    // The slug frequently *is* a valid key. Try it directly first.
    try {
      const raw = await this.fetchTeam(target.baseUrl, target.slug);
      const id = toStringId(pick(raw, ['team_id', 'id', 'teamId']));
      if (id) {
        notes.push(`Resolved slug "${target.slug}" -> id ${id} via /api/teams`);
        return id;
      }
    } catch (err) {
      notes.push(`Direct team lookup for slug failed: ${asMessage(err)}`);
    }

    // Otherwise the slug is also accepted by leaderboard endpoints; use it as-is.
    notes.push(`Falling back to slug "${target.slug}" as source id`);
    return target.slug;
  }

  private async fetchTeam(baseUrl: string, id: string): Promise<Record<string, unknown>> {
    const url = `${baseUrl}/api/teams/${encodeURIComponent(id)}?format=json`;
    const payload = await fetchJson(url, this.opts);
    const rows = unwrapData(payload);
    if (!rows.length) {
      throw new ProviderError(`Empty team payload from ${url}`, this.name);
    }
    return rows[0];
  }

  /**
   * Members come from the team fundraising leaderboard endpoint. Paginates via
   * `offset` until fewer than a full page is returned.
   */
  private async fetchParticipants(baseUrl: string, id: string, notes: string[]) {
    const all: Record<string, unknown>[] = [];
    let offset = 0;
    // Hard cap to avoid runaway loops if pagination metadata is missing.
    for (let page = 0; page < 50; page++) {
      const url =
        `${baseUrl}/api/fundraiser_team_leaderboard/${encodeURIComponent(id)}/fundraising` +
        `?format=json&limit=${COLLECTION.pageSize}&offset=${offset}`;
      let rows: Record<string, unknown>[];
      try {
        const payload = await fetchJson(url, this.opts);
        rows = unwrapData(payload);
      } catch (err) {
        if (page === 0) throw err; // first page failing is fatal
        notes.push(`Pagination stopped early at offset ${offset}: ${asMessage(err)}`);
        break;
      }
      if (!rows.length) break;
      all.push(...rows);
      if (rows.length < COLLECTION.pageSize) break;
      offset += COLLECTION.pageSize;
    }

    if (!all.length) {
      throw new ProviderError(`No participants returned for team ${id}`, this.name);
    }
    return all.map((raw, i) => mapParticipant(raw, i));
  }

  /** Extract today's target from the payload, falling back to the day key only. */
  private deriveDay(teamRaw: Record<string, unknown>): ChallengeDayData | null {
    const dayKey = dayKeyInTimeZone(new Date(), CAMPAIGN_TIMEZONE);
    const target = pick(teamRaw, [
      'daily_target',
      'today_target',
      'target_today',
      'daily_pushup_target',
    ]);
    if (target === undefined) {
      logger.debug('No daily target in API payload; UI will fall back to target schedule', {
        dayKey,
      });
      return { dayKey, dayNumber: challengeDayNumber(dayKey), targetPerParticipant: 0 };
    }
    return {
      dayKey,
      dayNumber: challengeDayNumber(dayKey),
      targetPerParticipant: toNumber(target),
    };
  }
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
