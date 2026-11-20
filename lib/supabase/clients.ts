import 'server-only';

// SERVER ONLY, enforced by the import above: if a Client Component ever imports
// this file the build fails, which is the only reliable way to keep the
// service-role key out of a browser bundle.
//
// The catalogue is code (lib/catalog/fixtures.ts), so there is no catalogue
// client. The database holds only what customers send us:
//
//   serviceClient()    service-role key, RLS BYPASSED. Order and inquiry writes
//                      against ja_* tables only. No anon policy exists on any
//                      ja_* table, so the anon key can read and write nothing.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabasePublicEnv } from './env';

const NO_AUTH = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/**
 * Every database ATTEMPT is bounded: without a ceiling a hung Supabase would hold
 * the request (and, for checkout, the customer) until the platform kills it.
 * The service client is built with `db: { retry: false }`, so there is exactly
 * one attempt and the ceiling is the real worst case. (postgrest-js would
 * otherwise retry a GET that answers 503/520 up to 3 times with 1s/2s/4s backoff.)
 */
export const DB_TIMEOUT_MS = { service: 5_000 } as const;

/**
 * Wraps a fetch so every call carries an abort signal that fires after `timeoutMs`.
 *
 * A budget overrun is rethrown as an error named AbortError, NOT the native
 * TimeoutError: postgrest-js retries a GET that fails with anything but an
 * AbortError (3 attempts, 1s/2s/4s backoff), which would turn this 5 second
 * ceiling into roughly 27 seconds. An AbortError is returned as a plain error
 * object and never retried (and retries are off anyway on the fresh and service clients).
 */
export function fetchWithTimeout(
  timeoutMs: number,
  base: typeof fetch = (input, init) => fetch(input, init),
  extra: (init: RequestInit | undefined) => RequestInit = (init) => init ?? {},
): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return base(input, { ...extra(init), signal }).catch((error: unknown) => {
      if (timeout.aborted && !init?.signal?.aborted) {
        throw new DOMException(`Database request timed out after ${timeoutMs}ms`, 'AbortError');
      }
      throw error;
    });
  };
}

let cachedService: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient | null {
  if (cachedService) return cachedService;
  const env = getSupabasePublicEnv();
  const key = getServiceRoleKey();
  if (!env || !key) return null;
  cachedService = createClient(env.url, key, {
    ...NO_AUTH,
    db: { retry: false },
    global: {
      fetch: fetchWithTimeout(DB_TIMEOUT_MS.service, undefined, (init) => ({ ...init, cache: 'no-store' })),
    },
  });
  return cachedService;
}

