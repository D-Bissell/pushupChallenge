import { describe, it, expect } from 'vitest';
import {
  pick,
  toNumber,
  unwrapData,
  mapTeam,
  mapParticipant,
  ensureRanks,
} from '../scrapers/funraisinMap.js';
import { teamApiResponse, teamLeaderboardPage1, driftedTeamResponse } from './fixtures.js';

describe('toNumber', () => {
  it('parses plain numbers', () => expect(toNumber(42)).toBe(42));
  it('parses numeric strings', () => expect(toNumber('1234')).toBe(1234));
  it('strips currency formatting', () => expect(toNumber('$3,275.50')).toBe(3275.5));
  it('handles junk safely', () => expect(toNumber('n/a')).toBe(0));
  it('handles null/undefined', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });
});

describe('pick', () => {
  it('returns the first present candidate', () => {
    expect(pick({ b: 2 }, ['a', 'b'])).toBe(2);
  });
  it('skips empty strings and nulls', () => {
    expect(pick({ a: '', b: null, c: 5 }, ['a', 'b', 'c'])).toBe(5);
  });
});

describe('unwrapData', () => {
  it('unwraps the {data:[]} envelope', () => {
    expect(unwrapData(teamLeaderboardPage1)).toHaveLength(6);
  });
  it('wraps a single {data:{}} object into an array', () => {
    expect(unwrapData(teamApiResponse)).toHaveLength(1);
  });
  it('passes through bare arrays', () => {
    expect(unwrapData([{ a: 1 }])).toHaveLength(1);
  });
});

describe('mapTeam', () => {
  it('maps a well-formed team payload', () => {
    const team = mapTeam(unwrapData(teamApiResponse)[0], 'a23');
    expect(team).toMatchObject({
      sourceId: '12345',
      slug: 'a23',
      name: 'A23 Office Warriors',
      totalPushUps: 48210,
      fundraising: 3275.5,
      participantCount: 6,
      rank: 14,
    });
  });

  it('tolerates a drifted field shape', () => {
    const team = mapTeam(unwrapData(driftedTeamResponse)[0], 'legacy');
    expect(team.totalPushUps).toBe(100);
    expect(team.fundraising).toBe(50);
    expect(team.participantCount).toBe(2);
  });
});

describe('mapParticipant', () => {
  const rows = unwrapData(teamLeaderboardPage1);

  it('composes a name from first/last when no name field', () => {
    expect(mapParticipant(rows[0], 0).name).toBe('Dana Bissell');
  });
  it('uses the name field directly when present', () => {
    expect(mapParticipant(rows[1], 1).name).toBe('Sam Carter');
  });
  it('handles alternate fundraising keys and currency strings', () => {
    expect(mapParticipant(rows[2], 2).fundraising).toBe(510.5);
  });
  it('defaults active to true when not specified', () => {
    expect(mapParticipant(rows[0], 0).active).toBe(true);
  });
  it('respects explicit inactive flag', () => {
    expect(mapParticipant(rows[5], 5).active).toBe(false);
  });
});

describe('ensureRanks', () => {
  it('fills missing ranks by total push-ups', () => {
    const participants = rowsToParticipants();
    const ranked = ensureRanks(participants);
    const byId = Object.fromEntries(ranked.map((p) => [p.sourceId, p.rank]));
    // Highest total push-ups (Dana, 12050) ranks first.
    expect(byId['1001']).toBe(1);
    expect(byId['1006']).toBe(6);
  });
});

function rowsToParticipants() {
  return unwrapData(teamLeaderboardPage1).map((r, i) => {
    const p = mapParticipant(r, i);
    return { ...p, rank: undefined };
  });
}
