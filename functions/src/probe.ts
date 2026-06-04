/**
 * One-off API discovery probe (not part of the app).
 *
 * The build sandbox can't reach the source site, but GitHub Actions can — so we
 * run this there to discover the *real* public data source for a team page.
 * It tries a range of candidate API endpoints and scans the public page HTML
 * for the endpoints the page itself calls and for embedded data.
 *
 * Triggered by .github/workflows/probe.yml. Read the logs to design the
 * provider, then this file + workflow can be deleted.
 */
const BASE = 'https://www.thepushupchallenge.com.au';
const SLUG = process.env.PROBE_SLUG || 'a23';
const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const candidates = [
  `/api/teams/${SLUG}?format=json`,
  `/api/teams?format=json`,
  `/api/team/${SLUG}?format=json`,
  `/api/fundraiser_profile/${SLUG}?format=json`,
  `/api/fundraiser/${SLUG}?format=json`,
  `/api/fundraiser_team_leaderboard/${SLUG}/fundraising?format=json`,
  `/api/fundraiser_team/${SLUG}?format=json`,
  `/api/topfundraisers/10?format=json`,
  `/api/page/${SLUG}?format=json`,
  `/fundraisers/${SLUG}?format=json`,
];

async function get(path: string, headers: Record<string, string>): Promise<void> {
  const url = BASE + path;
  try {
    const res = await fetch(url, { headers });
    const ct = res.headers.get('content-type') ?? '';
    const text = await res.text();
    console.log(`\n=== ${path}\n    status=${res.status} content-type=${ct} len=${text.length}`);
    console.log('    body[0..700]:', JSON.stringify(text.slice(0, 700)));
  } catch (e) {
    console.log(`\n=== ${path}  FETCH ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function scanPage(): Promise<void> {
  const url = `${BASE}/fundraisers/${SLUG}`;
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
  const html = await res.text();
  console.log(`\n##### PAGE ${url}  status=${res.status} len=${html.length}`);

  const apiRefs = [...new Set(html.match(/\/api\/[A-Za-z0-9_\/{}.\-?=&]+/g) ?? [])].slice(0, 60);
  console.log('API references found in page:\n', JSON.stringify(apiRefs, null, 2));

  const markers = [
    '__INITIAL_STATE__',
    '__NEXT_DATA__',
    '__NUXT__',
    'application/json',
    'application/ld+json',
    'data-fundraiser',
    'data-team',
    'team_id',
    'total_raised',
    'pushups',
    'push_ups',
    'leaderboard',
    'funraisin',
    'window.app',
  ];
  for (const m of markers) console.log(`marker ${JSON.stringify(m)}:`, html.includes(m));

  // Dump any application/(ld+)json script blocks (truncated).
  const scripts = [
    ...html.matchAll(/<script[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g),
  ];
  scripts.slice(0, 3).forEach((s, i) =>
    console.log(`\njson-script[${i}][0..1500]:`, s[1].trim().slice(0, 1500))
  );

  // Dump inline state assignments (truncated).
  const state = html.match(/(window\.[A-Za-z_]+\s*=\s*\{[\s\S]{0,1500})/);
  if (state) console.log('\ninline-state[0..1500]:', state[1].slice(0, 1500));
}

async function main(): Promise<void> {
  console.log(`Probing slug="${SLUG}"`);
  // Try both a plain UA and a browser UA — some APIs gate on User-Agent.
  for (const path of candidates) {
    await get(path, { 'User-Agent': BROWSER_UA, Accept: 'application/json, text/plain, */*' });
  }
  await scanPage();
  console.log('\nProbe complete.');
}

main().catch((e) => {
  console.error('probe fatal', e);
  process.exit(1);
});
