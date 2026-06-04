/**
 * API discovery probe v2.
 *
 * v1 established: the CRM API needs auth, the public JSON endpoints reject the
 * slug ("access denied"), and the team page is server-rendered HTML containing
 * the data (markers team_id / pushups / leaderboard present).
 *
 * v2 goals:
 *   1. Pull the numeric team_id / page_id out of the page HTML.
 *   2. Retry the public JSON endpoints using the numeric id.
 *   3. Dump HTML context around key markers so we can design a scraper if the
 *      JSON route stays closed.
 */
const BASE = 'https://www.thepushupchallenge.com.au';
const SLUG = process.env.PROBE_SLUG || 'a23';
const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function contexts(html: string, needle: string, span = 220, max = 4): string[] {
  const out: string[] = [];
  let from = 0;
  while (out.length < max) {
    const i = html.indexOf(needle, from);
    if (i === -1) break;
    out.push(html.slice(Math.max(0, i - 60), i + span).replace(/\s+/g, ' '));
    from = i + needle.length;
  }
  return out;
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1] : null;
}

async function getText(url: string): Promise<{ status: number; ct: string; body: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json, text/html, */*' },
  });
  return { status: res.status, ct: res.headers.get('content-type') ?? '', body: await res.text() };
}

async function main(): Promise<void> {
  const page = await getText(`${BASE}/fundraisers/${SLUG}`);
  console.log(`PAGE status=${page.status} len=${page.body.length}`);
  const html = page.body;

  // 1. Extract candidate numeric ids from inline JS / attributes.
  const idPatterns: Record<string, RegExp> = {
    'team_id=': /team_id\s*[:=]\s*['"]?(\d+)/i,
    'page_id=': /page_id\s*[:=]\s*['"]?(\d+)/i,
    'fundraiser_id=': /fundraiser_id\s*[:=]\s*['"]?(\d+)/i,
    'teamId=': /teamId\s*[:=]\s*['"]?(\d+)/i,
    'data-team-id': /data-team-id=['"](\d+)/i,
    'data-id': /data-id=['"](\d+)/i,
  };
  const ids = new Set<string>();
  for (const [label, re] of Object.entries(idPatterns)) {
    const v = firstMatch(html, re);
    console.log(`id ${label} -> ${v ?? '(none)'}`);
    if (v) ids.add(v);
  }

  // 2. Show context around the markers so we can see how data is embedded.
  for (const needle of ['team_id', 'pushups', 'leaderboard', 'raised', 'goal', 'fundraiser_team']) {
    console.log(`\n--- context "${needle}" ---`);
    for (const c of contexts(html, needle)) console.log('  …', c);
  }

  // 3. Look for any AJAX/endpoint hints the page's JS uses.
  const urlHints = [
    ...new Set(html.match(/['"](\/[A-Za-z0-9_\-]+\/[A-Za-z0-9_\-\/{}.?=&]+)['"]/g) ?? []),
  ]
    .filter((u) => /leaderboard|fundraiser|team|api|json|ajax|donat/i.test(u))
    .slice(0, 40);
  console.log('\n--- candidate endpoint strings in page ---');
  console.log(JSON.stringify(urlHints, null, 2));

  // 4. Retry the JSON endpoints with each numeric id we found.
  console.log('\n--- retry JSON endpoints with numeric ids ---');
  for (const id of ids) {
    for (const path of [
      `/api/fundraiser_team_leaderboard/${id}/fundraising?format=json`,
      `/api/fundraiser_team_leaderboard/${id}/activity?format=json`,
      `/api/fundraiser_profile/${id}?format=json`,
      `/api/team/${id}?format=json`,
      `/api/teampage/${id}?format=json`,
    ]) {
      try {
        const r = await getText(BASE + path);
        console.log(`\n${path}\n  status=${r.status} ct=${r.ct} len=${r.body.length}`);
        console.log('  body[0..500]:', JSON.stringify(r.body.slice(0, 500)));
      } catch (e) {
        console.log(`${path} ERROR ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log('\nProbe v2 complete.');
}

main().catch((e) => {
  console.error('probe fatal', e);
  process.exit(1);
});
