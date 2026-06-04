import { describe, it, expect } from 'vitest';
import {
  unescapeJsString,
  extractTeamMembers,
  extractTeamId,
  extractTeamName,
  extractTeamRank,
  mapPageMember,
  ensureRanks,
} from '../scrapers/funraisinMap.js';
import { teamPageHtml, teamPageHtmlRanked } from './fixtures.js';

describe('unescapeJsString', () => {
  it('unescapes quotes, slashes and whitespace escapes', () => {
    expect(unescapeJsString('a\\"b')).toBe('a"b');
    expect(unescapeJsString("O\\'Carter")).toBe("O'Carter");
    expect(unescapeJsString('a\\/b')).toBe('a/b');
    expect(unescapeJsString('a\\nb')).toBe('a\nb');
  });
});

describe('extractTeamMembers', () => {
  const members = extractTeamMembers(teamPageHtml);

  it('finds and parses the embedded teamMembers JSON', () => {
    expect(members).toHaveLength(3);
    expect(members[0].name).toBe('Dana Bissell');
  });

  it('handles escaped apostrophes inside names', () => {
    expect(members[1].name).toBe("Sam O'Carter");
  });

  it('returns [] when the marker is absent', () => {
    expect(extractTeamMembers('<html>no data here</html>')).toEqual([]);
  });
});

describe('extractTeamId / Name / Rank', () => {
  it('pulls the numeric team id from a /team/<id> URL', () => {
    expect(extractTeamId(teamPageHtml)).toBe('115773');
  });
  it('reads and cleans the team name from <title>', () => {
    expect(extractTeamName(teamPageHtml, 'a23')).toBe('A23');
  });
  it('falls back to the upper-cased slug when no title', () => {
    expect(extractTeamName('<html></html>', 'a23')).toBe('A23');
  });
  it('treats "1000+" rank as unranked (null)', () => {
    expect(extractTeamRank(teamPageHtml)).toBeNull();
  });
  it('parses a concrete numeric rank', () => {
    expect(extractTeamRank(teamPageHtmlRanked)).toBe(42);
  });
});

describe('mapPageMember', () => {
  const members = extractTeamMembers(teamPageHtml);

  it('maps total_steps -> push-ups and m_raised -> fundraising', () => {
    const dana = mapPageMember(members[0], 0);
    expect(dana).toMatchObject({
      sourceId: '1001',
      slug: 'danab',
      name: 'Dana Bissell',
      totalPushUps: 12050,
      fundraising: 1200,
      active: true,
    });
  });

  it('handles decimal pushup strings and decimal dollars', () => {
    const priya = mapPageMember(members[2], 2);
    expect(priya.totalPushUps).toBe(8600);
    expect(priya.fundraising).toBe(510.5);
  });

  it('ranks members by push-ups when no rank present', () => {
    const ranked = ensureRanks(members.map((m, i) => mapPageMember(m, i)));
    const byId = Object.fromEntries(ranked.map((p) => [p.sourceId, p.rank]));
    expect(byId['1001']).toBe(1); // 12050 highest
    expect(byId['1003']).toBe(3); // 8600 lowest
  });
});
