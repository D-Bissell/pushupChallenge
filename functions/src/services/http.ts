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

/** True for transient HTTP statuses worth retrying. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 425 || status >= 500;
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
          'User-Agent': USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
          'Accept-Language': 'en-AU,en;q=0.9',
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

      const delay = backoffBaseMs * 2 ** attempt;
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
