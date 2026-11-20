type Env = Record<string, string | undefined>;

/** Exactly one of the two public Supabase variables is set: a deploy mistake, never demo mode. */
export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

/**
 * Neither variable set (blank counts as unset) => null, meaning demo mode on
 * fixtures. Both set => the values. Exactly one set => THROWS, so a half-set
 * production config fails loudly instead of quietly serving fixtures.
 */
export function getSupabasePublicEnv(env: Env = process.env): { url: string; key: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return { url, key };
  if (url) throw new SupabaseConfigError('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing while NEXT_PUBLIC_SUPABASE_URL is set');
  if (key) throw new SupabaseConfigError('NEXT_PUBLIC_SUPABASE_URL is missing while NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
  return null;
}

export function getServiceRoleKey(env: Env = process.env): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}
