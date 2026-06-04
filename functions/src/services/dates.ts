import { CHALLENGE_START } from '../config.js';

/**
 * Returns the yyyy-mm-dd day key for a given instant in a given IANA timezone.
 * Uses Intl rather than a date library to keep the Functions bundle tiny.
 */
export function dayKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** 1-based challenge day number for a given day key, or undefined if out of range. */
export function challengeDayNumber(dayKey: string, start = CHALLENGE_START): number | undefined {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const dayMs = Date.parse(`${dayKey}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(dayMs)) return undefined;
  const diffDays = Math.round((dayMs - startMs) / 86_400_000);
  return diffDays >= 0 ? diffDays + 1 : undefined;
}
