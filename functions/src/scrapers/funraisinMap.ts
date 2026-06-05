/**
 * Pure mapping helpers that turn raw Funraisin API payloads into our normalised
 * domain types. Kept separate from network code so they are trivially unit
 * testable with recorded fixtures, and tolerant of field-name drift.
 */
import type { ParticipantData, TeamData } from '../types/index.js';

type Raw = Record<string, unknown>;

/** First defined, non-null value among the candidate keys. */
export function pick(obj: Raw, keys: string[]): unknown {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/** Coerce a value that may be a number, numeric string, or "$1,234.50" to a number. */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function toStringId(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

/**
 * The Funraisin envelope is `{ results, data }`. Some endpoints return the data
 * object directly. This normalises both into an array of records.
 */
export function unwrapData(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload as Raw[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Raw;
    if (Array.isArray(obj.data)) return obj.data as Raw[];
    if (obj.data && typeof obj.data === 'object') return [obj.data as Raw];
    return [obj];
  }
  return [];
}

export function mapTeam(raw: Raw, slug: string): TeamData {
  return {
    sourceId: toStringId(pick(raw, ['team_id', 'id', 'teamId'])) || slug,
    slug,
    name: String(pick(raw, ['team_name', 'name', 'title']) ?? 'Unknown Team'),
    totalPushUps: toNumber(
      pick(raw, ['total_pushups', 'pushups', 'total_push_ups', 'push_ups', 'activity_total'])
    ),
    fundraising: toNumber(
      pick(raw, ['total_raised', 'raised', 'amount_raised', 'fundraising_total', 'total'])
    ),
    fundraisingGoal: pick(raw, ['goal', 'target', 'fundraising_goal'])
      ? toNumber(pick(raw, ['goal', 'target', 'fundraising_goal']))
      : undefined,
    participantCount: toNumber(
      pick(raw, ['member_count', 'members', 'participant_count', 'team_members'])
    ),
    rank: pick(raw, ['rank', 'team_rank', 'position'])
      ? toNumber(pick(raw, ['rank', 'team_rank', 'position']))
      : undefined,
  };
}

export function mapParticipant(raw: Raw, index: number): ParticipantData {
  const first = pick(raw, ['first_name', 'firstname']);
  const last = pick(raw, ['last_name', 'lastname']);
  const composed = [first, last].filter(Boolean).join(' ').trim();
  const name = String(
    pick(raw, ['name', 'fundraiser_name', 'display_name']) ?? composed ?? ''
  ).trim();

  return {
    sourceId:
      toStringId(pick(raw, ['fundraiser_id', 'id', 'page_id', 'fundraiserId'])) || `idx-${index}`,
    slug: pick(raw, ['slug', 'url', 'page_url'])
      ? String(pick(raw, ['slug', 'url', 'page_url']))
      : undefined,
    name: name || `Participant ${index + 1}`,
    todayPushUps: toNumber(
      pick(raw, ['today_pushups', 'pushups_today', 'today_push_ups', 'daily_pushups'])
    ),
    totalPushUps: toNumber(
      pick(raw, ['total_pushups', 'pushups', 'total_push_ups', 'push_ups', 'activity_total'])
    ),
    fundraising: toNumber(
      pick(raw, ['total_raised', 'raised', 'amount_raised', 'fundraising_total', 'total'])
    ),
    rank: pick(raw, ['rank', 'position']) ? toNumber(pick(raw, ['rank', 'position'])) : undefined,
    avatarUrl: pick(raw, ['avatar', 'image', 'profile_image', 'photo'])
      ? String(pick(raw, ['avatar', 'image', 'profile_image', 'photo']))
      : undefined,
    active:
      pick(raw, ['active', 'is_active']) !== undefined
        ? Boolean(pick(raw, ['active', 'is_active']))
        : true,
  };
}

/** Rank participants by total push-ups when the source doesn't provide a rank. */
export function ensureRanks(participants: ParticipantData[]): ParticipantData[] {
  const hasRanks = participants.every((p) => typeof p.rank === 'number' && p.rank > 0);
  if (hasRanks) return participants;
  const sorted = [...participants].sort((a, b) => b.totalPushUps - a.totalPushUps);
  const rankById = new Map<string, number>();
  sorted.forEach((p, i) => rankById.set(p.sourceId, i + 1));
  return participants.map((p) => ({ ...p, rank: rankById.get(p.sourceId) }));
}

// ---------------------------------------------------------------------------
// Embedded-page parsing (the real source — see docs/DataSourceFindings.md).
//
// The Funraisin team page is server-rendered and embeds the member list as a
// single-quoted JS string of JSON:
//   var teamMembers = '[{"name":"…","member_id":"…","total_steps":"172.00",
//                        "m_raised":0,"m_username":"…","m_target_steps":"3307"}]';
//   var members2 = JSON.parse(teamMembers);
// Push-ups are stored in `total_steps`; dollars in `m_raised`.
// ---------------------------------------------------------------------------

/** Unescape a JS single-quoted string body (handles \" \' \/ \\ \n \t etc.). */
export function unescapeJsString(s: string): string {
  return s.replace(/\\(["'/\\bfnrt])/g, (_m, c: string) => {
    switch (c) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case 'b':
        return '\b';
      case 'f':
        return '\f';
      default:
        return c; // " ' / \
    }
  });
}

/** Extract and parse the embedded `teamMembers` JSON array from page HTML. */
export function extractTeamMembers(html: string): Raw[] {
  // Accept single- or double-quoted assignment, with or without `var`/`let`.
  const m =
    html.match(/teamMembers\s*=\s*'([\s\S]*?)';/) ?? html.match(/teamMembers\s*=\s*"([\s\S]*?)";/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(unescapeJsString(m[1]));
    return Array.isArray(parsed) ? (parsed as Raw[]) : [];
  } catch {
    return [];
  }
}

/** The team's numeric source id, leaked in /team/<id> URLs on the page. */
export function extractTeamId(html: string): string | null {
  return html.match(/\/team\/(\d+)/)?.[1] ?? null;
}

/** Team display name from the page <title>, stripped of the site prefix. */
export function extractTeamName(html: string, slug: string): string {
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const cleaned = title.replace(/^\s*the push-up challenge\s*[-:]\s*/i, '').trim();
  return cleaned || slug.toUpperCase();
}

/** Team rank from "currently ranked N" text; null when shown as "1000+". */
export function extractTeamRank(html: string): number | null {
  const m = html.match(/currently ranked\s+([\d,]+)(\+?)/i);
  if (!m || m[2] === '+') return null;
  return toNumber(m[1]);
}

/** Map one embedded member object to our normalised participant. */
export function mapPageMember(raw: Raw, index: number): ParticipantData {
  const total = toNumber(pick(raw, ['total_steps']));
  const photo = pick(raw, ['m_photo', 'm_event_photo']);
  return {
    sourceId: toStringId(pick(raw, ['member_id', 'id'])) || `idx-${index}`,
    slug: pick(raw, ['m_username']) ? String(pick(raw, ['m_username'])) : undefined,
    name: String(pick(raw, ['name']) ?? `Participant ${index + 1}`).trim(),
    // A single page fetch only exposes cumulative totals; per-day figures are
    // derived later from snapshot diffs.
    todayPushUps: 0,
    totalPushUps: Math.round(total),
    fundraising: toNumber(pick(raw, ['m_raised', 'total_raised'])),
    avatarUrl: photo ? String(photo) : undefined,
    active: true,
  };
}
