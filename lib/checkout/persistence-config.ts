// Is order persistence CONFIGURED? Used by the checkout route to refuse a LIVE
// Maya payment link when a paid order would have nowhere to be recorded.
//
// "Configured" means exactly what lib/supabase/env.ts means: the public pair
// (getSupabasePublicEnv) is non-null AND the service-role key
// (getServiceRoleKey) is non-null, with blank counting as unset. It reports
// variable NAMES only, never values. This is about configuration: a runtime
// database failure is still best-effort and is handled by recordOrder.

type Env = Record<string, string | undefined>;

export const PERSISTENCE_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/** Names of the persistence variables that are unset or blank. Empty means configured. */
export function missingPersistenceVars(env: Env = process.env): string[] {
  return PERSISTENCE_ENV_VARS.filter((name) => !env[name]?.trim());
}
