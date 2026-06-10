/**
 * The Push-Up Challenge — Google Apps Script collector.
 *
 * A free, Google-hosted alternative to the GitHub Actions collector. It exists
 * because the source (thepushupchallenge.com.au) sits behind a WAF that
 * intermittently 403s datacenter IPs — and GitHub's Azure runners get blocked
 * unpredictably. Apps Script's UrlFetchApp egresses from Google's network,
 * which `docs/DataSourceFindings.md` recorded as able to reach the host.
 *
 * It performs the same job as functions/src (fetch the team page, parse the
 * embedded `teamMembers` JSON, derive per-day push-ups, and write the identical
 * Firestore shape the dashboard reads) but runs on a native recurring time
 * trigger and authenticates to Firestore via the service-account JWT — so it
 * needs no Google Cloud OAuth consent, only the script's own permissions.
 *
 * Setup lives in apps-script/README.md. The short version:
 *   1. Paste this file + appsscript.json into a new script.google.com project.
 *   2. Project Settings → Script Properties → add SERVICE_ACCOUNT_JSON
 *      (the full Firebase service-account key file contents).
 *   3. Run probe() once and confirm it logs HTTP 200 (Google egress works).
 *   4. Run collect() once to confirm a full write, then run setup() to install
 *      the recurring trigger (every TRIGGER_EVERY_MINUTES minutes).
 */

// ---------------------------------------------------------------------------
// Config — mirrors functions/src/config.ts. Keep in sync if the schedule moves.
// ---------------------------------------------------------------------------
var SOURCE_BASE_URL = 'https://www.thepushupchallenge.com.au';
var CAMPAIGN_TIMEZONE = 'Australia/Sydney';

/** Teams to collect. teamId is the Firestore doc id; slug is the page slug. */
var TRACKED_TEAMS = [{ teamId: 'a23', slug: 'a23', baseUrl: SOURCE_BASE_URL }];

var CHALLENGE_START = '2026-06-03';

/** Official per-participant daily targets, keyed by campaign-local day. */
var DAILY_TARGETS = {
  '2026-06-03': 100, '2026-06-04': 72, '2026-06-05': 120, '2026-06-06': 150,
  '2026-06-07': 0, '2026-06-08': 140, '2026-06-09': 170, '2026-06-10': 130,
  '2026-06-11': 160, '2026-06-12': 167, '2026-06-13': 191, '2026-06-14': 0,
  '2026-06-15': 120, '2026-06-16': 220, '2026-06-17': 160, '2026-06-18': 190,
  '2026-06-19': 170, '2026-06-20': 208, '2026-06-21': 0, '2026-06-22': 120,
  '2026-06-23': 180, '2026-06-24': 229, '2026-06-25': 160, '2026-06-26': 150,
};
var CHALLENGE_TOTAL_TARGET = Object.keys(DAILY_TARGETS).reduce(
  function (a, k) { return a + DAILY_TARGETS[k]; }, 0
);

/** Fetch behaviour — matches COLLECTION in config.ts. */
var FETCH = { timeoutMs: 15000, retries: 4, backoffBaseMs: 1000 };

/**
 * How often the time trigger runs collect(). Apps Script only allows
 * 1, 5, 10, 15, or 30. 15 keeps Firestore writes and snapshot growth modest
 * for the free Spark plan while staying fresh enough for the dashboard.
 */
var TRIGGER_EVERY_MINUTES = 15;

var USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

// ===========================================================================
// Entry points
// ===========================================================================

/** Time-trigger target: collect every tracked team, isolating failures. */
function collect() {
  TRACKED_TEAMS.forEach(function (team) {
    var run = ingestTeam_(team);
    Logger.log(
      'team=%s status=%s provider=%s participants=%s duration=%sms%s',
      run.teamId, run.status, run.provider, run.participantsWritten,
      run.durationMs, run.error ? ' error=' + run.error : ''
    );
  });
}

/**
 * One-off egress check. Run this first: if it logs HTTP 200 and a member count,
 * Google's egress reaches the source and this collector will work. A 403 means
 * Apps Script's IPs are blocked too — fall back to another option.
 */
function probe() {
  var t = TRACKED_TEAMS[0];
  var url = t.baseUrl + '/fundraisers/' + encodeURIComponent(t.slug);
  var res = UrlFetchApp.fetch(url, {
    headers: browserHeaders_(),
    muteHttpExceptions: true,
    followRedirects: true,
  });
  var code = res.getResponseCode();
  var members = code === 200 ? extractTeamMembers_(res.getContentText()).length : 0;
  Logger.log('probe: HTTP %s, %s members parsed from %s', code, members, url);
  if (code === 200 && members > 0) {
    Logger.log('OK — Google egress works. Run collect() then setup().');
  } else if (code === 200) {
    Logger.log('Reached the page (200) but found no embedded members — check parsing.');
  } else {
    Logger.log('Blocked (HTTP %s). Apps Script egress appears WAF-blocked for this host.', code);
  }
}

/** Install the recurring time trigger (idempotent — clears existing first). */
function setup() {
  removeTriggers();
  ScriptApp.newTrigger('collect').timeBased().everyMinutes(TRIGGER_EVERY_MINUTES).create();
  Logger.log('Installed: collect() every %s minutes.', TRIGGER_EVERY_MINUTES);
}

/** Remove all triggers for this script. */
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  Logger.log('Removed all triggers.');
}

// ===========================================================================
// Ingest — mirrors services/ingest.ts + firestore.ts (persistCollection)
// ===========================================================================

function ingestTeam_(team) {
  var startedAt = new Date();
  var record = {
    teamId: team.teamId, provider: 'none', startedAt: startedAt,
    participantsWritten: 0,
  };
  try {
    var result = collectTeam_(team);
    var written = persistCollection_(team, result);
    var finishedAt = new Date();
    record.status = (result.meta.notes && result.meta.notes.length) ? 'partial' : 'success';
    record.provider = result.meta.provider;
    record.finishedAt = finishedAt;
    record.durationMs = finishedAt.getTime() - startedAt.getTime();
    record.participantsWritten = written;
    record.notes = result.meta.notes;
  } catch (err) {
    var failedAt = new Date();
    record.status = 'error';
    record.finishedAt = failedAt;
    record.durationMs = failedAt.getTime() - startedAt.getTime();
    record.error = (err && err.message) ? err.message : String(err);
  }
  try {
    recordSyncRun_(record);
  } catch (e) {
    Logger.log('Failed to record sync run: %s', e);
  }
  return record;
}

/** Fetch + parse one team's page into the normalised CollectionResult shape. */
function collectTeam_(team) {
  var url = team.baseUrl + '/fundraisers/' + encodeURIComponent(team.slug);
  var html = fetchPage_(url);

  var rawMembers = extractTeamMembers_(html);
  if (!rawMembers.length) {
    throw new Error('Could not find embedded teamMembers JSON on the page');
  }

  var participants = ensureRanks_(rawMembers.map(mapPageMember_));
  var sourceId = extractTeamId_(html) || team.resolvedSourceId || team.slug;
  Logger.log('parsed %s members for team %s (source id %s)', participants.length, team.teamId, sourceId);
  var totalPushUps = participants.reduce(function (s, p) { return s + p.totalPushUps; }, 0);
  var fundraising = participants.reduce(function (s, p) { return s + p.fundraising; }, 0);
  var dayKey = dayKey_(new Date());

  return {
    team: {
      sourceId: sourceId,
      slug: team.slug,
      name: extractTeamName_(html, team.slug),
      totalPushUps: totalPushUps,
      fundraising: fundraising,
      participantCount: participants.length,
      challengeTargetPerParticipant: CHALLENGE_TOTAL_TARGET,
      rank: extractTeamRank_(html),
    },
    participants: participants,
    day: {
      dayKey: dayKey,
      dayNumber: challengeDayNumber_(dayKey),
      targetPerParticipant: dailyTargetFor_(dayKey),
    },
    meta: {
      provider: 'apps-script-page',
      // notes carry *problems* only (they drive the dashboard's "Degraded"
      // badge). A clean parse logs its count instead of noting it, so a healthy
      // run reads as "Live", not degraded.
      notes: [],
    },
  };
}

/** Write current state + time-series snapshots, exactly like firestore.ts. */
function persistCollection_(team, result) {
  var capturedAt = new Date();
  var dayKey = (result.day && result.day.dayKey) || dayKey_(capturedAt);
  var snapId = dayKey + '_' + capturedAt.getTime();
  var teamPath = 'teams/' + team.teamId;

  // Read existing participants once to derive "today" from a stored baseline.
  var existing = listParticipants_(team.teamId);

  var writes = [];

  // 1. Current team state.
  writes.push(updateWrite_(teamPath, fsMap_({
    teamId: fsStr_(team.teamId),
    slug: fsStr_(result.team.slug),
    name: fsStr_(result.team.name),
    totalPushUps: fsNum_(result.team.totalPushUps),
    fundraising: fsNum_(result.team.fundraising),
    fundraisingGoal: result.team.fundraisingGoal != null ? fsNum_(result.team.fundraisingGoal) : fsNull_(),
    participantCount: fsNum_(result.team.participantCount),
    challengeTargetPerParticipant: result.team.challengeTargetPerParticipant != null
      ? fsNum_(result.team.challengeTargetPerParticipant) : fsNull_(),
    rank: result.team.rank != null ? fsNum_(result.team.rank) : fsNull_(),
    source: fsMapV_(fsMap_({
      provider: fsStr_(result.meta.provider),
      slug: fsStr_(result.team.slug),
      resolvedId: fsStr_(result.team.sourceId),
      baseUrl: fsStr_(team.baseUrl),
    })),
    currentDay: result.day ? fsMapV_(fsMap_({
      dayKey: fsStr_(result.day.dayKey),
      dayNumber: result.day.dayNumber != null ? fsNum_(result.day.dayNumber) : fsNull_(),
      targetPerParticipant: fsNum_(result.day.targetPerParticipant),
    })) : fsNull_(),
    updatedAt: fsTs_(capturedAt),
  })));

  // 2. Team time-series snapshot.
  writes.push(updateWrite_(teamPath + '/teamSnapshots/' + snapId, fsMap_({
    teamId: fsStr_(team.teamId),
    capturedAt: fsTs_(capturedAt),
    dayKey: fsStr_(dayKey),
    totalPushUps: fsNum_(result.team.totalPushUps),
    fundraising: fsNum_(result.team.fundraising),
    participantCount: fsNum_(result.team.participantCount),
    rank: result.team.rank != null ? fsNum_(result.team.rank) : fsNull_(),
  })));

  // 3. Fundraising-only snapshot.
  writes.push(updateWrite_(teamPath + '/fundraisingSnapshots/' + snapId, fsMap_({
    teamId: fsStr_(team.teamId),
    capturedAt: fsTs_(capturedAt),
    dayKey: fsStr_(dayKey),
    fundraising: fsNum_(result.team.fundraising),
  })));

  // 4. Per-participant current state + snapshot.
  result.participants.forEach(function (p) {
    var pid = p.sourceId;
    var prev = existing[pid];
    var today = computeToday_(
      p.totalPushUps,
      prev && typeof prev.totalPushUps === 'number' ? prev.totalPushUps : undefined,
      prev ? prev.dayBaseline : undefined,
      dayKey
    );

    writes.push(updateWrite_(teamPath + '/participants/' + pid, fsMap_({
      participantId: fsStr_(pid),
      teamId: fsStr_(team.teamId),
      name: fsStr_(p.name),
      slug: p.slug != null ? fsStr_(p.slug) : fsNull_(),
      todayPushUps: fsNum_(today.todayPushUps),
      totalPushUps: fsNum_(p.totalPushUps),
      fundraising: fsNum_(p.fundraising),
      rank: p.rank != null ? fsNum_(p.rank) : fsNull_(),
      avatarUrl: p.avatarUrl != null ? fsStr_(p.avatarUrl) : fsNull_(),
      active: fsBool_(p.active != null ? p.active : true),
      dayBaseline: fsMapV_(fsMap_({
        dayKey: fsStr_(today.baseline.dayKey),
        totalAtStart: fsNum_(today.baseline.totalAtStart),
      })),
      updatedAt: fsTs_(capturedAt),
    })));

    writes.push(updateWrite_(teamPath + '/participantSnapshots/' + pid + '_' + snapId, fsMap_({
      participantId: fsStr_(pid),
      teamId: fsStr_(team.teamId),
      capturedAt: fsTs_(capturedAt),
      dayKey: fsStr_(dayKey),
      todayPushUps: fsNum_(today.todayPushUps),
      totalPushUps: fsNum_(p.totalPushUps),
      fundraising: fsNum_(p.fundraising),
      rank: p.rank != null ? fsNum_(p.rank) : fsNull_(),
    })));
  });

  firestoreCommit_(writes);
  return result.participants.length;
}

/** Append a syncRuns doc (auto id), mirroring recordSyncRun. */
function recordSyncRun_(run) {
  var fields = {
    teamId: fsStr_(run.teamId),
    status: fsStr_(run.status),
    provider: fsStr_(run.provider),
    startedAt: fsTs_(run.startedAt),
    finishedAt: fsTs_(run.finishedAt || new Date()),
    durationMs: fsNum_(run.durationMs || 0),
    participantsWritten: fsNum_(run.participantsWritten || 0),
    createdAt: fsTs_(new Date()),
  };
  if (run.notes && run.notes.length) {
    fields.notes = fsArrV_(run.notes.map(function (n) { return fsStr_(n); }));
  }
  if (run.error) fields.error = fsStr_(run.error);
  firestoreCreateDoc_('syncRuns', fsMap_(fields));
}

/** Per-day derivation — identical logic to services/daily.ts. */
function computeToday_(currentTotal, prevTotal, prevBaseline, dayKey) {
  var baseline = (prevBaseline && prevBaseline.dayKey === dayKey)
    ? prevBaseline
    : { dayKey: dayKey, totalAtStart: (prevTotal != null ? prevTotal : currentTotal) };
  var todayPushUps = Math.max(0, currentTotal - baseline.totalAtStart);
  return { todayPushUps: todayPushUps, baseline: baseline };
}

// ===========================================================================
// HTTP fetch with retry/backoff (mirrors services/http.ts)
// ===========================================================================

function browserHeaders_() {
  return {
    'User-Agent': USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };
}

function isRetryable_(status) {
  return status === 403 || status === 408 || status === 425 || status === 429 || status >= 500;
}

function fetchPage_(url) {
  var lastErr = null;
  for (var attempt = 0; attempt <= FETCH.retries; attempt++) {
    try {
      var res = UrlFetchApp.fetch(url, {
        headers: browserHeaders_(),
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true,
      });
      var code = res.getResponseCode();
      if (code >= 200 && code < 300) return res.getContentText();
      if (isRetryable_(code) && attempt < FETCH.retries) {
        throw new Error('Retryable HTTP ' + code);
      }
      throw new Error('HTTP ' + code + ' for ' + url);
    } catch (err) {
      lastErr = err;
      var msg = (err && err.message) ? err.message : String(err);
      var nonRetryable = msg.indexOf('HTTP ') === 0 && msg.indexOf('Retryable') !== 0;
      if (attempt === FETCH.retries || nonRetryable) break;
      var delay = FETCH.backoffBaseMs * Math.pow(2, attempt) +
        Math.floor(Math.random() * FETCH.backoffBaseMs);
      Logger.log('fetch attempt %s failed (%s); backing off %sms', attempt + 1, msg, delay);
      Utilities.sleep(delay);
    }
  }
  throw (lastErr instanceof Error ? lastErr : new Error(String(lastErr)));
}

// ===========================================================================
// Page parsing — ported verbatim from scrapers/funraisinMap.ts
// ===========================================================================

function pick_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function toNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    var n = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

function toStringId_(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function unescapeJsString_(s) {
  return s.replace(/\\(["'/\\bfnrt])/g, function (_m, c) {
    switch (c) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      default: return c;
    }
  });
}

function extractTeamMembers_(html) {
  var m = html.match(/teamMembers\s*=\s*'([\s\S]*?)';/) ||
    html.match(/teamMembers\s*=\s*"([\s\S]*?)";/);
  if (!m) return [];
  try {
    var parsed = JSON.parse(unescapeJsString_(m[1]));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function extractTeamId_(html) {
  var m = html.match(/\/team\/(\d+)/);
  return m ? m[1] : null;
}

function extractTeamName_(html, slug) {
  var m = html.match(/<title>([^<]*)<\/title>/i);
  var title = m ? m[1] : '';
  var cleaned = title.replace(/^\s*the push-up challenge\s*[-:]\s*/i, '').trim();
  return cleaned || slug.toUpperCase();
}

function extractTeamRank_(html) {
  var m = html.match(/currently ranked\s+([\d,]+)(\+?)/i);
  if (!m || m[2] === '+') return null;
  return toNumber_(m[1]);
}

function mapPageMember_(raw, index) {
  var total = toNumber_(pick_(raw, ['total_steps']));
  var photo = pick_(raw, ['m_photo', 'm_event_photo']);
  return {
    sourceId: toStringId_(pick_(raw, ['member_id', 'id'])) || ('idx-' + index),
    slug: pick_(raw, ['m_username']) ? String(pick_(raw, ['m_username'])) : undefined,
    name: String(pick_(raw, ['name']) || ('Participant ' + (index + 1))).trim(),
    todayPushUps: 0,
    totalPushUps: Math.round(total),
    fundraising: toNumber_(pick_(raw, ['m_raised', 'total_raised'])),
    avatarUrl: photo ? String(photo) : undefined,
    active: true,
  };
}

function ensureRanks_(participants) {
  var hasRanks = participants.every(function (p) {
    return typeof p.rank === 'number' && p.rank > 0;
  });
  if (hasRanks) return participants;
  var sorted = participants.slice().sort(function (a, b) {
    return b.totalPushUps - a.totalPushUps;
  });
  var rankById = {};
  sorted.forEach(function (p, i) { rankById[p.sourceId] = i + 1; });
  return participants.map(function (p) {
    p.rank = rankById[p.sourceId];
    return p;
  });
}

// ===========================================================================
// Dates — mirror services/dates.ts
// ===========================================================================

function dayKey_(date) {
  return Utilities.formatDate(date, CAMPAIGN_TIMEZONE, 'yyyy-MM-dd');
}

function challengeDayNumber_(dayKey) {
  var startMs = Date.parse(CHALLENGE_START + 'T00:00:00Z');
  var dayMs = Date.parse(dayKey + 'T00:00:00Z');
  if (isNaN(startMs) || isNaN(dayMs)) return null;
  var diff = Math.round((dayMs - startMs) / 86400000);
  return diff >= 0 ? diff + 1 : null;
}

function dailyTargetFor_(dayKey) {
  return DAILY_TARGETS[dayKey] || 0;
}

// ===========================================================================
// Firestore REST — auth + writes (service-account JWT, no user OAuth)
// ===========================================================================

function getServiceAccount_() {
  var raw = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_JSON');
  if (!raw) {
    throw new Error('Missing Script Property SERVICE_ACCOUNT_JSON (paste the key file contents).');
  }
  var sa = JSON.parse(raw);
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error('SERVICE_ACCOUNT_JSON must include client_email, private_key, project_id.');
  }
  return sa;
}

function getAccessToken_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('fs_token');
  if (cached) return cached;

  var sa = getServiceAccount_();
  var now = Math.floor(Date.now() / 1000);
  var enc = function (obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  };
  var unsigned = enc({ alg: 'RS256', typ: 'JWT' }) + '.' + enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  var sig = Utilities.computeRsaSha256Signature(unsigned, sa.private_key);
  var jwt = unsigned + '.' + Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '');

  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    muteHttpExceptions: true,
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('OAuth token error: ' + res.getContentText());
  }
  var token = JSON.parse(res.getContentText()).access_token;
  cache.put('fs_token', token, 3000); // ~50 min (tokens last 1h)
  return token;
}

function firestoreBase_() {
  return 'https://firestore.googleapis.com/v1/projects/' +
    getServiceAccount_().project_id + '/databases/(default)/documents';
}

function docName_(path) {
  return 'projects/' + getServiceAccount_().project_id +
    '/databases/(default)/documents/' + path;
}

/** A commit "update" write that sets the document to exactly these fields. */
function updateWrite_(path, fieldsMap) {
  return { update: { name: docName_(path), fields: fieldsMap } };
}

/** Atomically apply writes (chunked at 450 to stay under the 500 limit). */
function firestoreCommit_(writes) {
  var token = getAccessToken_();
  var url = 'https://firestore.googleapis.com/v1/projects/' +
    getServiceAccount_().project_id + '/databases/(default)/documents:commit';
  for (var i = 0; i < writes.length; i += 450) {
    var chunk = writes.slice(i, i + 450);
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
      payload: JSON.stringify({ writes: chunk }),
    });
    if (res.getResponseCode() !== 200) {
      throw new Error('Firestore commit failed: ' + res.getResponseCode() + ' ' + res.getContentText());
    }
  }
}

/** Create a doc with an auto-generated id in the given top-level collection. */
function firestoreCreateDoc_(collection, fieldsMap) {
  var token = getAccessToken_();
  var res = UrlFetchApp.fetch(firestoreBase_() + '/' + collection, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
    payload: JSON.stringify({ fields: fieldsMap }),
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Firestore create failed: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

/** List existing participants → { pid: {totalPushUps, dayBaseline} } for baselines. */
function listParticipants_(teamId) {
  var token = getAccessToken_();
  var out = {};
  var pageToken = '';
  do {
    var url = firestoreBase_() + '/teams/' + encodeURIComponent(teamId) +
      '/participants?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    if (code === 404) return out; // collection doesn't exist yet (first run)
    if (code !== 200) {
      throw new Error('Firestore list failed: ' + code + ' ' + res.getContentText());
    }
    var body = JSON.parse(res.getContentText());
    (body.documents || []).forEach(function (d) {
      var id = d.name.split('/').pop();
      out[id] = fsDecodeFields_(d.fields || {});
    });
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return out;
}

// ---------------------------------------------------------------------------
// Firestore value encoding / decoding
// ---------------------------------------------------------------------------
function fsStr_(v) { return { stringValue: String(v) }; }
function fsBool_(v) { return { booleanValue: !!v }; }
function fsNull_() { return { nullValue: null }; }
function fsTs_(d) {
  var date = (d instanceof Date) ? d : new Date(d);
  return { timestampValue: date.toISOString() };
}
function fsNum_(n) {
  var x = Number(n);
  if (!isFinite(x)) x = 0;
  return (x % 1 === 0) ? { integerValue: String(x) } : { doubleValue: x };
}
/** Build a {fields} object (for commit writes / createDocument top level). */
function fsMap_(fields) { return fields; }
/** Wrap a {fields} object as a nested mapValue. */
function fsMapV_(fields) { return { mapValue: { fields: fields } }; }
function fsArrV_(values) { return { arrayValue: { values: values } }; }

function fsDecode_(v) {
  if (v == null) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return fsDecodeFields_(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fsDecode_);
  return null;
}
function fsDecodeFields_(fields) {
  var o = {};
  for (var k in fields) o[k] = fsDecode_(fields[k]);
  return o;
}
