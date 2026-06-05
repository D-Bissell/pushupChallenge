import { logger } from './logger.js';

export interface FetchJsonOptions {
  /** Per-attempt timeout in milliseconds. */
  timeoutMs?: number;
  /** Number of retry attempts after the first try. */
  retries?: number;
  /** Base delay for exponential backoff, in ms. */
  backoffBaseMs?: number;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Abort signal for cooperative cancellation. */
  signal?: AbortSignal;
}

const DEFAULTS = {
  timeoutMs: 15_000,
  retries: 3,
  backoffBaseMs: 1_000,
};

/**
 * The source returns 403 for non-browser User-Agents (verified in production),
 * so we present a standard desktop-Chrome UA. This is a low-frequency read of a
 * public page for a personal dashboard.
 */
export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * True for transient HTTP statuses worth retrying.
 *
 * 403 is included deliberately: the source sits behind a WAF that intermittently
 * 403s automated/datacenter traffic. These blocks are usually transient, so a
 * backed-off retry recovers within the same run instead of failing it.
 */
function isRetryableStatus(status: number): boolean {
  return (
    status === 403 || status === 408 || status === 425 || status === 429 || status >= 500
  );
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Fetch text with timeout + exponential-backoff retry.
 *
 * Retries on network errors, timeouts, and transient HTTP statuses. Non-retryable
 * 4xx responses fail fast.
 */
export async function fetchText(url: string, opts: FetchJsonOptions = {}): Promise<string> {
  const { timeoutMs, retries, backoffBaseMs, headers, signal } = { ...DEFAULTS, ...opts };
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        headers: {
          // Present as a real browser navigation — the source's WAF 403s
          // requests that don't look like one.
          'User-Agent': USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-AU,en;q=0.9',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          ...headers,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (isRetryableStatus(res.status) && attempt < retries) {
          throw new HttpError(`Retryable HTTP ${res.status}`, res.status, url);
        }
        throw new HttpError(`HTTP ${res.status} for ${url}`, res.status, url);
      }

      return await res.text();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries;
      const nonRetryable = err instanceof HttpError && !isRetryableStatus(err.status);

      if (isLastAttempt || nonRetryable) break;

      // Exponential backoff with jitter (avoids hammering the WAF in lock-step).
      const delay = backoffBaseMs * 2 ** attempt + Math.floor(Math.random() * backoffBaseMs);
      logger.warn('HTTP attempt failed, backing off', {
        url,
        attempt: attempt + 1,
        delayMs: delay,
        error: err instanceof Error ? err.message : String(err),
      });
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Fetch and parse JSON with the same resilience as {@link fetchText}. */
export async function fetchJson<T = unknown>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const text = await fetchText(url, opts);
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from ${url}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
