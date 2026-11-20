import 'server-only';

// THE CHECKOUT IS REACHABLE ONLY THROUGH A SECRET LINK.
//
//   https://<site>/checkout/<CHECKOUT_LINK_TOKEN>
//
// The owner sends that link to a customer who is ready to pay. Nothing on the
// public site links to it and it is noindex, but obscurity is not the gate: the
// token is. The page 404s on a wrong token, and the API refuses a request that
// does not carry the right one, so a bot that guesses `/api/checkout` gets
// nothing either.
//
// FAIL CLOSED. With CHECKOUT_LINK_TOKEN unset or too weak the checkout does not
// exist (404 / 404). An unconfigured instance closes the door, it never opens it.
// To retire a link that has been shared too widely, change the variable: every
// old link stops working at once.

import { createHash, timingSafeEqual } from 'node:crypto';

export const CHECKOUT_TOKEN_VAR = 'CHECKOUT_LINK_TOKEN';

/** Long enough that it cannot be guessed or enumerated. 24 URL-safe characters is ~140 bits of a random token. */
export const MIN_TOKEN_LENGTH = 24;
const MAX_TOKEN_LENGTH = 128;
const TOKEN_RE = /^[A-Za-z0-9_-]+$/;
const MIN_DISTINCT_CHARS = 8;
/** The development token used by .env.local and the Playwright config. Public, so refused on a live host. */
const DEV_TOKEN = 'devlink0123456789abcdefghij';

export type LinkEnv = Record<string, string | undefined>;

/** A set base URL that is not a sandbox host means real payments. A blank one means sandbox. */
function isLiveBase(env: LinkEnv): boolean {
  const base = env.MAYA_PAYMENT_LINK_BASE_URL?.trim();
  return !!base && !/sandbox/i.test(base);
}

/** The configured token, or null when checkout is closed (unset, too short, or not URL-safe). */
export function getCheckoutToken(env: LinkEnv = process.env): string | null {
  const raw = env[CHECKOUT_TOKEN_VAR]?.trim();
  if (!raw) return null;
  if (raw.length < MIN_TOKEN_LENGTH || raw.length > MAX_TOKEN_LENGTH || !TOKEN_RE.test(raw)) return null;
  // A token of one repeated character ("aaaa...") is long but guessable.
  if (new Set(raw).size < MIN_DISTINCT_CHARS) return null;
  // The documented development token is public (README, playwright config): it must never open a LIVE checkout.
  if (raw === DEV_TOKEN && isLiveBase(env)) return null;
  return raw;
}

/** Is a checkout link configured at all? */
export function isCheckoutOpen(env: LinkEnv = process.env): boolean {
  return getCheckoutToken(env) !== null;
}

/**
 * Constant-time comparison. Both sides are hashed first so their lengths are
 * equal and the comparison time does not reveal how long a prefix matched.
 */
export function isValidCheckoutToken(candidate: unknown, env: LinkEnv = process.env): boolean {
  const expected = getCheckoutToken(env);
  if (expected === null) return false;
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > MAX_TOKEN_LENGTH) return false;
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** The path (not the host) of the checkout link, for the operator. */
export function checkoutPath(token: string): string {
  return `/checkout/${token}`;
}
