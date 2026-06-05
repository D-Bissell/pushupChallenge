import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson, HttpError } from '../services/http.js';

// The Functions logger pulls in the runtime; stub it for unit isolation.
vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('fetchJson retry/timeout', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('returns parsed JSON on first success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
    await expect(fetchJson('https://x.test/api')).resolves.toEqual({ ok: true });
  });

  it('retries on a 500 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJson('https://x.test/api', { backoffBaseMs: 1, retries: 2 });
    expect(result).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails fast on a non-retryable 404', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson('https://x.test/api', { retries: 3, backoffBaseMs: 1 })).rejects.toThrow(
      HttpError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting retries on persistent 503', async () => {
    const fetchMock = vi.fn(async () => new Response('busy', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchJson('https://x.test/api', { retries: 2, backoffBaseMs: 1 })
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('retries a transient 403 (WAF) then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('blocked', { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson('https://x.test/api', { retries: 3, backoffBaseMs: 1 })).resolves.toEqual(
      { ok: true }
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
