#!/usr/bin/env node
/**
 * Guards against config drift between the two collectors. The Apps Script
 * collector (apps-script/Code.gs) duplicates a few constants from the
 * authoritative functions/src/config.ts — the daily target schedule and the
 * challenge start date. If they diverge, the dashboard's target line and "today"
 * figures would differ depending on which collector wrote the data.
 *
 * Run: node scripts/check-appsscript-config.mjs
 */
import { readFileSync } from 'node:fs';

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

/** Extract a { 'yyyy-mm-dd': number, ... } map from a source file's DAILY_TARGETS. */
function parseDailyTargets(file) {
  const src = readFileSync(file, 'utf8');
  const block = src.match(/DAILY_TARGETS[^{]*\{([\s\S]*?)\}/);
  if (!block) throw new Error(`DAILY_TARGETS not found in ${file}`);
  const map = {};
  for (const m of block[1].matchAll(/'(\d{4}-\d{2}-\d{2})'\s*:\s*(\d+)/g)) {
    map[m[1]] = Number(m[2]);
  }
  return map;
}

function parseStart(file) {
  const src = readFileSync(file, 'utf8');
  return src.match(/CHALLENGE_START\s*=\s*'([\d-]+)'/)?.[1];
}

const ts = 'functions/src/config.ts';
const gs = 'apps-script/Code.gs';

const a = parseDailyTargets(ts);
const b = parseDailyTargets(gs);

const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
let mismatches = 0;
for (const k of keys) {
  if (a[k] !== b[k]) {
    fail(`DAILY_TARGETS["${k}"] differs: ${ts}=${a[k]} vs ${gs}=${b[k]}`);
    mismatches++;
  }
}

const sum = (m) => Object.values(m).reduce((x, y) => x + y, 0);
if (sum(a) !== sum(b)) fail(`DAILY_TARGETS totals differ: ${ts}=${sum(a)} vs ${gs}=${sum(b)}`);

if (parseStart(ts) !== parseStart(gs)) {
  fail(`CHALLENGE_START differs: ${ts}=${parseStart(ts)} vs ${gs}=${parseStart(gs)}`);
}

if (!process.exitCode) {
  console.log(`✓ apps-script config in sync (${keys.size} days, total ${sum(a)}, start ${parseStart(ts)})`);
} else {
  console.error(`\n${mismatches} mismatch(es). Update apps-script/Code.gs to match ${ts}.`);
}
