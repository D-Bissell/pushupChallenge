import * as cheerio from 'cheerio';
import { ChallengeDataProvider, ProviderError } from './provider.js';
import type { CollectionResult, ParticipantData, TeamTarget } from '../types/index.js';
import { fetchText } from '../services/http.js';
import { COLLECTION, CAMPAIGN_TIMEZONE } from '../config.js';
import { dayKeyInTimeZone, challengeDayNumber } from '../services/dates.js';
import { ensureRanks, toNumber } from './funraisinMap.js';
import { logger } from '../services/logger.js';

/**
 * Priority #4 fallback: parse the public team page.
 *
 * Strategy is "embedded data first, DOM second" to avoid brittle selectors:
 *  1. Look for embedded JSON the Funraisin page ships (inline state / data
 *     islands) and reuse it.
 *  2. Only if that fails, fall back to resilient DOM heuristics (data-* hooks
 *     and text patterns), never deep positional selectors.
 *
 * This exists purely so a temporary API outage or shape change doesn't take the
 * dashboard fully dark. The API provider remains the source of truth.
 */
export class ScrapeProvider implements ChallengeDataProvider {
  readonly name = 'html-scrape';

  async collect(target: TeamTarget): Promise<CollectionResult> {
    const url = `${target.baseUrl}/fundraisers/${encodeURIComponent(target.slug)}`;
    const html = await fetchText(url, {
      timeoutMs: COLLECTION.timeoutMs,
      retries: COLLECTION.retries,
      backoffBaseMs: COLLECTION.backoffBaseMs,
      headers: { Accept: 'text/html' },
    });

    const notes: string[] = [];
    const embedded = this.tryEmbeddedJson(html, notes);
    const $ = cheerio.load(html);

    const teamName =
      embedded?.name ??
      $('[data-team-name]').first().attr('data-team-name') ??
      $('h1').first().text().trim() ??
      target.slug;

    const fundraising =
      embedded?.fundraising ??
      this.extractCurrency($, ['[data-total-raised]', '.fundraising-total', '.raised']);

    const totalPushUps =
      embedded?.totalPushUps ??
      this.extractNumber($, ['[data-total-pushups]', '.pushups-total', '.total-pushups']);

    const participants: ParticipantData[] = embedded?.participants ?? this.extractParticipants($);

    if (!participants.length && !fundraising && !totalPushUps) {
      throw new ProviderError('Scrape yielded no usable data', this.name);
    }

    const dayKey = dayKeyInTimeZone(new Date(), CAMPAIGN_TIMEZONE);

    return {
      team: {
        sourceId: target.resolvedSourceId ?? target.slug,
        slug: target.slug,
        name: teamName,
        totalPushUps: totalPushUps || participants.reduce((s, p) => s + p.totalPushUps, 0),
        fundraising,
        participantCount: participants.length,
      },
      participants: ensureRanks(participants),
      day: { dayKey, dayNumber: challengeDayNumber(dayKey), targetPerParticipant: 0 },
      meta: {
        provider: this.name,
        fetchedAt: new Date().toISOString(),
        notes: ['Served from HTML fallback — verify API provider', ...notes],
      },
    };
  }

  /** Look for inline JSON state Funraisin pages commonly embed. */
  private tryEmbeddedJson(
    html: string,
    notes: string[]
  ): {
    name?: string;
    fundraising?: number;
    totalPushUps?: number;
    participants?: ParticipantData[];
  } | null {
    const patterns = [
      /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
      /window\.__DATA__\s*=\s*(\{[\s\S]*?\});/,
      /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (!match) continue;
      try {
        JSON.parse(match[1]);
        notes.push('Found embedded JSON island on page');
        // Intentionally not deeply mapped here — the API provider is the real
        // path. We record that an island exists so the mapping can be hardened
        // if scraping ever becomes primary.
        return null;
      } catch {
        // try next pattern
      }
    }
    return null;
  }

  private extractParticipants($: cheerio.CheerioAPI): ParticipantData[] {
    const out: ParticipantData[] = [];
    // Prefer stable data hooks over positional selectors.
    $('[data-participant], [data-fundraiser-id], .team-member').each((i, el) => {
      const $el = $(el);
      const name =
        $el.attr('data-name') ?? $el.find('[data-name], .member-name, .name').first().text().trim();
      if (!name) return;
      out.push({
        sourceId: $el.attr('data-fundraiser-id') ?? `scrape-${i}`,
        name,
        todayPushUps: 0,
        totalPushUps: toNumber($el.find('[data-pushups], .pushups').first().text()),
        fundraising: toNumber($el.find('[data-raised], .raised').first().text()),
        active: true,
      });
    });
    if (!out.length) logger.warn('Scrape found no participant rows');
    return out;
  }

  private extractCurrency($: cheerio.CheerioAPI, selectors: string[]): number {
    for (const sel of selectors) {
      const text = $(sel).first().text();
      if (text) return toNumber(text);
    }
    return 0;
  }

  private extractNumber($: cheerio.CheerioAPI, selectors: string[]): number {
    return this.extractCurrency($, selectors);
  }
}
