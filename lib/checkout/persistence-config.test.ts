import { describe, expect, it } from 'vitest';
import { getServiceRoleKey, getSupabasePublicEnv } from '@/lib/supabase/env';
import { missingPersistenceVars } from '@/lib/checkout/persistence-config';

const full = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
};

describe('missingPersistenceVars', () => {
  it('is empty only when all three are set', () => {
    expect(missingPersistenceVars(full)).toEqual([]);
  });

  it.each(Object.keys(full))('names %s when it is unset or blank, and nothing else', (name) => {
    expect(missingPersistenceVars({ ...full, [name]: undefined })).toEqual([name]);
    expect(missingPersistenceVars({ ...full, [name]: '   ' })).toEqual([name]);
  });

  it('names all three when nothing is set, and never returns a value', () => {
    expect(missingPersistenceVars({})).toEqual(Object.keys(full));
    expect(JSON.stringify(missingPersistenceVars({ ...full, SUPABASE_SERVICE_ROLE_KEY: '' }))).not.toContain('test-');
  });

  it('agrees with lib/supabase/env.ts: configured iff the public pair and the service key are non-null', () => {
    const cases = [
      full,
      { ...full, SUPABASE_SERVICE_ROLE_KEY: '' },
      { ...full, NEXT_PUBLIC_SUPABASE_ANON_KEY: ' ' },
      { SUPABASE_SERVICE_ROLE_KEY: 'k' },
      {},
    ];
    for (const env of cases) {
      let pub = null as ReturnType<typeof getSupabasePublicEnv>;
      try {
        pub = getSupabasePublicEnv(env);
      } catch {
        pub = null; // half-set pair: not configured
      }
      const configured = pub !== null && getServiceRoleKey(env) !== null;
      expect(missingPersistenceVars(env).length === 0).toBe(configured);
    }
  });
});
