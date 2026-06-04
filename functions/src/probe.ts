/**
 * API discovery probe v3.
 *
 * v2 revealed: numeric team id = 115773 (from a /team/{id} QR URL), members are
 * embedded in the page as JSON (fields: name, m_username, member_id, total_steps
 * = push-ups, m_raised = $ raised, m_target), and the leaderboard endpoint
 * returns 200 for a numeric id (403 only for the slug).
 *
 * v3 confirms the cleanest source: (a) does the leaderboard JSON API work with
 * the real id? (b) what exactly is the embedded members array + team totals?
 */
const BASE = 'https://www.thepushupchallenge.com.au';
const SLUG = process.env.PROBE_SLUG || 'a23';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function getText(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
  return { status: res.status, ct: res.headers.get('content-type') ?? '', body: await res.text() };
}

/** Extract a balanced [...] array starting at the '[' before the first needle. */
function extractArray(html: string, needle: string): string | null {
  const at = html.indexOf(needle);
  if (at === -1) return null;
  const start = html.lastIndexOf('[', at);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

function ctx(html: string, needle: string, span = 180, max = 3): string[] {
  const out: string[] = [];
  let from = 0;
  while (out.length < max) {
    const i = html.indexOf(needle, from);
    if (i === -1) break;
    out.push(html.slice(Math.max(0, i - 50), i + span).replace(/\s+/g, ' '));
    from = i + needle.length;
  }
  return out;
}

async function main(): Promise<void> {
  const page = await getText(`${BASE}/fundraisers/${SLUG}`);
  const html = page.body;
  console.log(`PAGE status=${page.status} len=${html.length}`);

  // Real numeric team id from the QR / team URLs.
  const teamId = html.match(/\/team\/(\d+)/)?.[1] ?? null;
  console.log('teamId from /team/<id>:', teamId);

  // 1. Confirm the leaderboard JSON API with the real id.
  if (teamId) {
    for (const path of [
      `/api/fundraiser_team_leaderboard/${teamId}/fundraising?format=json`,
      `/api/fundraiser_team_leaderboard/${teamId}/activity?format=json`,
      `/api/fundraiser_team_leaderboard/${teamId}?format=json`,
      `/api/fundraiser_team/${teamId}?format=json`,
    ]) {
      const r = await getText(BASE + path);
      console.log(`\n>>> ${path}\n    status=${r.status} ct=${r.ct} len=${r.body.length}`);
      console.log('    body[0..1400]:', JSON.stringify(r.body.slice(0, 1400)));
    }
  }

  // 2. The embedded members array (push-ups + raised live here).
  const arr = extractArray(html, '"member_id"');
  console.log('\n--- embedded members array ---');
  if (arr) {
    console.log('raw length:', arr.length);
    console.log('raw[0..1600]:', arr.slice(0, 1600));
    try {
      const parsed = JSON.parse(arr);
      console.log('PARSED OK, count =', parsed.length);
      console.log('keys of [0]:', Object.keys(parsed[0] ?? {}));
      console.log('sample[0]:', JSON.stringify(parsed[0]));
    } catch (e) {
      console.log('JSON.parse failed:', e instanceof Error ? e.message : String(e));
    }
  } else {
    console.log('(not found)');
  }

  // 3. Team-level totals / name / rank / target context.
  for (const needle of [
    'total_steps',
    'team_raised',
    'team_total',
    'currentTotal',
    'pushup_target',
    'ranked',
    'var members',
    'team_name',
    'data-raised',
  ]) {
    console.log(`\n--- ctx "${needle}" ---`);
    for (const c of ctx(html, needle)) console.log('  …', c);
  }

  console.log('\nProbe v3 complete.');
}

main().catch((e) => {
  console.error('probe fatal', e);
  process.exit(1);
});
