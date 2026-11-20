import { describe, expect, it } from 'vitest';
import { SupabaseConfigError, getServiceRoleKey, getSupabasePublicEnv } from '@/lib/supabase/env';

describe('supabase env', () => {
  it('returns null (demo mode) when neither public value is set, blank counts as unset', () => {
    expect(getSupabasePublicEnv({})).toBeNull();
    expect(getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: '  ', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })).toBeNull();
  });

  it('returns trimmed values when both are present', () => {
    expect(
      getSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: ' https://x.supabase.co ',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ' k ',
      }),
    ).toEqual({ url: 'https://x.supabase.co', key: 'k' });
  });

  it('THROWS SupabaseConfigError naming the missing variable when exactly one is set', () => {
    expect(() => getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(
      SupabaseConfigError,
    );
    expect(() => getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
    expect(() =>
      getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k', NEXT_PUBLIC_SUPABASE_URL: ' ' }),
    ).toThrow('NEXT_PUBLIC_SUPABASE_URL');
    expect(() => getSupabasePublicEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toThrow(
      expect.objectContaining({ name: 'SupabaseConfigError' }),
    );
  });

  it('reads the service-role key separately and treats blank as unset', () => {
    expect(getServiceRoleKey({})).toBeNull();
    expect(getServiceRoleKey({ SUPABASE_SERVICE_ROLE_KEY: '  ' })).toBeNull();
    expect(getServiceRoleKey({ SUPABASE_SERVICE_ROLE_KEY: 'srv' })).toBe('srv');
  });
});
