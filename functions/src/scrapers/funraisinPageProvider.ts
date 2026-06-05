import { ChallengeDataProvider, ProviderError } from './provider.js';
import type { CollectionResult, TeamTarget } from '../types/index.js';
import { fetchText } from '../services/http.js';
import { COLLECTION, CAMPAIGN_TIMEZONE, dailyTargetFor } from '../config.js';
import { dayKeyInTimeZone, challengeDayNumber } from '../services/dates.js';
import {
  extractTeamMembers,
  extractTeamId,
  extractTeamName,
  extractTeamRank,
  mapPageMember,
  ensureRanks,
} from './funraisinMap.js';

/**
 * Primary source for The Push-Up Challenge.
 *
 * Discovery (see docs/DataSourceFindings.md) showed the platform's JSON API is
 * gated ("access denied" even with the numeric id), but the public, server-
 * rendered team page embeds the full member list as a JSON string:
 *
 *   var teamMembers = '[{ ...member... }]';
 *
 * We fetch that one page and parse the embedded JSON. Push-ups live in
 * `total_steps`, dollars in `m_raised`. This is a single request per run and is
 * far more stable than DOM scraping because it reads the page's own data, not
 * its markup.
 */
export class FunraisinPageProvider implements ChallengeDataProvider {
  readonly name = 'funraisin-page';

  async collect(target: TeamTarget): Promise<CollectionResult> {
    const url = `${target.baseUrl}/fundraisers/${encodeURIComponent(target.slug)}`;
    const html = await fetchText(url, {
      timeoutMs: COLLECTION.timeoutMs,
      retries: COLLECTION.retries,
      backoffBaseMs: COLLECTION.backoffBaseMs,
      // Uses the default browser User-Agent from http.ts; the source 403s
      // non-browser agents.
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });

    const rawMembers = extractTeamMembers(html);
    if (!rawMembers.length) {
      throw new ProviderError(
        'Could not find embedded teamMembers JSON on the page',
        this.name
      );
    }

    const participants = ensureRanks(rawMembers.map((m, i) => mapPageMember(m, i)));
    const sourceId = extractTeamId(html) ?? target.resolvedSourceId ?? target.slug;
    const totalPushUps = participants.reduce((sum, p) => sum + p.totalPushUps, 0);
    const fundraising = participants.reduce((sum, p) => sum + p.fundraising, 0);

    const dayKey = dayKeyInTimeZone(new Date(), CAMPAIGN_TIMEZONE);

    return {
      team: {
        sourceId,
        slug: target.slug,
        name: extractTeamName(html, target.slug),
        totalPushUps,
        fundraising,
        participantCount: participants.length,
        rank: extractTeamRank(html) ?? undefined,
      },
      participants,
      day: {
        dayKey,
        dayNumber: challengeDayNumber(dayKey),
        // Per-participant daily target from the official schedule (0 if unknown).
        targetPerParticipant: dailyTargetFor(dayKey),
      },
      meta: {
        provider: this.name,
        fetchedAt: new Date().toISOString(),
        notes: [`Parsed ${participants.length} members from embedded page JSON (team ${sourceId})`],
      },
    };
  }
}
