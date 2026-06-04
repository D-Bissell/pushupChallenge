import type { TeamTarget } from './types/index.js';

/**
 * Static configuration for the data collector.
 *
 * Multi-team support is intentional: the scheduled function iterates over
 * `TRACKED_TEAMS`, so adding a team is a one-line change here (plus, optionally,
 * a `config/teams` Firestore document which overrides this list at runtime).
 */

export const SOURCE_BASE_URL = 'https://www.thepushupchallenge.com.au';

/** IANA timezone the campaign runs in — used to compute the campaign-local day. */
export const CAMPAIGN_TIMEZONE = 'Australia/Sydney';

/** Teams tracked out of the box. */
export const TRACKED_TEAMS: TeamTarget[] = [
  {
    teamId: 'a23',
    slug: 'a23',
    baseUrl: SOURCE_BASE_URL,
  },
];

/**
 * Daily push-up targets for the challenge. The Push-Up Challenge sets a daily
 * target reflecting suicide statistics; these act as a backstop when the target
 * is not present in the API payload. Day 1 = 1 June.
 *
 * NOTE: confirm against the official target schedule each campaign year. The
 * provider prefers the live value and only falls back to this table.
 */
export const CHALLENGE_START = '2026-06-01';
export const CHALLENGE_DAYS = 24;

/** Provider behaviour. */
export const COLLECTION = {
  timeoutMs: 15_000,
  retries: 3,
  backoffBaseMs: 1_000,
  /** Max participants to request per page from the source. */
  pageSize: 50,
};
