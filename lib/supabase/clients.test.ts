import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DB_TIMEOUT_MS, fetchWithTimeout, serviceClient } from '@/lib/supabase/clients';

/** A fetch that never answers on its own but honours its abort signal, like the real one. */
function hungFetch() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    });
  });
}

describe('DB timeouts', () => {
  it('uses 5s for the service client', () => {
    expect(DB_TIMEOUT_MS).toEqual({ service: 5_000 });
  });

  it('fetchWithTimeout aborts a hung request after the budget, as a (non-retryable) AbortError', async () => {
    vi.useFakeTimers();
    try {
      const base = hungFetch();
      const wrapped = fetchWithTimeout(50, base as never);
      const pending = wrapped('https://db.example/rest/v1/ja_orders');
      const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError', message: expect.stringContaining('timed out') });
      await vi.advanceTimersByTimeAsync(51);
      await assertion;
      expect(base.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a caller-supplied signal working alongside the timeout', async () => {
    const base = hungFetch();
    const wrapped = fetchWithTimeout(60_000, base as never);
    const controller = new AbortController();
    const pending = wrapped('https://db.example/x', { signal: controller.signal });
    controller.abort(new Error('caller gave up'));
    await expect(pending).rejects.toThrow('caller gave up');
  });

  it('applies the extra init (cache mode) to every call', async () => {
    const base = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{}'));
    await fetchWithTimeout(1_000, base as never, (init) => ({ ...init, cache: 'no-store' }))('https://db.example/x');
    expect(base.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });
});

describe('serviceClient', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('is null without the full configuration (orders then report persisted:false)', () => {
    expect(serviceClient()).toBeNull();
  });

  it('a hung write is aborted after 5s', async () => {
    const requestedMs: number[] = [];
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hungFetch());
    // AbortSignal.timeout runs on a native timer that fake timers do not control:
    // route it through setTimeout so the 5s budget can be advanced, and record it.
    vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms: number) => {
      requestedMs.push(ms);
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms);
      return controller.signal;
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.example.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';

    const db = serviceClient()!;
    const outcome = Promise.resolve(db.from('ja_orders').insert({ id: 'x' })).then((r) => r.error?.message ?? 'no error');
    // supabase-js does some async work before it calls fetch: let it run until the timeout is armed.
    for (let i = 0; i < 50 && requestedMs.length === 0; i++) await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_001);
    expect(await outcome).toMatch(/timed out|timeout|abort/i);
    expect(requestedMs).toEqual([5_000]);
  });

  it('a 503 answer makes exactly ONE fetch attempt (postgrest-js retries are off)', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.example.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
    // serviceClient() caches the first client it built, which already has retries off.
    const db = serviceClient()!;
    const pending = Promise.resolve(db.from('ja_orders').select('*')).then((r) => r.error?.message ?? null);
    for (let i = 0; i < 50 && fetchSpy.mock.calls.length === 0; i++) await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    await pending;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
