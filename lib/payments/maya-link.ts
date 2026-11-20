// Builds the Maya Payment Link the customer is redirected to.
//
//   Production  https://mymaya.me/{merchantAlias}?amt={amount}
//   Sandbox     https://sandbox.mymaya.me/{merchantAlias}?amt={amount}
//
// `amt` is the ONLY parameter Maya documents. There is no reference, callback,
// webhook or signature, so this module cannot know whether anyone paid, and the
// amount is editable by the customer in their own browser, which is why the
// total is also recomputed and stored server-side. Do not add undocumented
// query parameters: they would not arrive. A verified payment is Maya's
// Checkout API, which belongs in a different file.
//
// ONE merchant alias, MAYA_MERCHANT_ALIAS: Judie's Audio has a single Maya
// merchant account and a single checkout.
//
// SAFETY PROPERTIES (each is enforced as code and pinned by a test):
//   1. Host allowlist, https only, no credentials.
//   2. The alias is validated against a strict class, not encoded.
//   3. A LIVE host never falls back to the sandbox alias: an unset alias on a
//      live host is an error, and the shared sandbox alias (SbxInv) is
//      rejected there. Only a SANDBOX host may fall back to SbxInv.
//   4. Over-ceiling amounts have their own error.
//   5. The base URL is a bare https host: no port, path, query, fragment or
//      credentials. buildMayaPaymentLink re-validates its config, so a
//      hand-built config cannot bypass any of the above.
//   6. A BLANK base URL means sandbox, and a blank base URL combined with a
//      configured alias is an error: a live alias must never ride a link that
//      is silently sandbox. Set MAYA_PAYMENT_LINK_BASE_URL explicitly.
//      Do not "fix" that error by adding a fallback.

import { MAYA_ALLOWED_HOSTS, MAYA_SANDBOX_HOSTS } from './maya-hosts';

/** Misconfiguration. Checkout fails CLOSED with a generic 503. */
export class PaymentLinkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentLinkConfigError';
  }
}

/**
 * The basket is simply too large. Deliberately NOT a PaymentLinkConfigError so
 * the route can tell the customer what to do instead of "temporarily unavailable".
 */
export class AmountTooLargeError extends Error {
  constructor(public readonly amount: number) {
    super(`Payment amount ${amount} exceeds the ${MAX_AMOUNT_PESOS} peso ceiling`);
    this.name = 'AmountTooLargeError';
  }
}

/** Guards an arithmetic accident, not a business rule. */
export const MAX_AMOUNT_PESOS = 10_000_000;

/** Maya's shared sandbox merchant. Money sent here reaches no real account. */
export const SANDBOX_ALIAS = 'SbxInv';

const DEFAULT_BASE_URL = 'https://sandbox.mymaya.me';

/** The one merchant alias variable. */
export const ALIAS_VAR = 'MAYA_MERCHANT_ALIAS';
const ALIAS_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type MayaLinkEnv = Record<string, string | undefined>;

export interface MayaLinkConfig {
  baseUrl: string;
  alias: string;
  isSandbox: boolean;
}

/**
 * Strictly validates a payment-link base URL. Used both when reading the
 * environment and again inside buildMayaPaymentLink, so a hand-built config
 * cannot smuggle a hostile host past the allowlist. The emitted base is built
 * from `hostname` only: no port, path, query, fragment or credentials survive.
 */
function parseBase(raw: string, label: string): { baseUrl: string; isSandbox: boolean } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new PaymentLinkConfigError(`${label} is not a valid URL: "${raw}"`);
  }
  if (parsed.protocol !== 'https:') {
    throw new PaymentLinkConfigError(`${label} must use https`);
  }
  if (!MAYA_ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new PaymentLinkConfigError(
      `${label} host "${parsed.hostname}" is not a Maya payment-link host ` +
        `(allowed: ${[...MAYA_ALLOWED_HOSTS].join(', ')})`,
    );
  }
  if (parsed.username || parsed.password) {
    throw new PaymentLinkConfigError(`${label} must not contain credentials`);
  }
  if (parsed.port !== '') {
    throw new PaymentLinkConfigError(`${label} must not specify a port`);
  }
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new PaymentLinkConfigError(`${label} must be a bare host with no path, query or fragment`);
  }
  return {
    baseUrl: `https://${parsed.hostname}`,
    isSandbox: MAYA_SANDBOX_HOSTS.has(parsed.hostname),
  };
}

function readBase(env: MayaLinkEnv): { baseUrl: string; isSandbox: boolean } {
  const explicit = env.MAYA_PAYMENT_LINK_BASE_URL?.trim();
  if (!explicit && env[ALIAS_VAR]?.trim()) {
    // Blank => sandbox. That is fine for plain local development, but if a
    // merchant alias is configured the operator clearly meant a live store, and
    // a forgotten base URL would quietly send real-alias links to the sandbox.
    // Fail closed instead.
    throw new PaymentLinkConfigError(
      `set MAYA_PAYMENT_LINK_BASE_URL explicitly when a merchant alias is configured (${ALIAS_VAR} set, base URL blank)`,
    );
  }
  return parseBase(explicit || DEFAULT_BASE_URL, 'MAYA_PAYMENT_LINK_BASE_URL');
}

/**
 * Shape check, plus: the shared sandbox alias is never valid on a live host
 * (it is a sandbox merchant, so takings would vanish).
 */
function checkAlias(alias: string, isSandbox: boolean, label: string): void {
  if (!ALIAS_RE.test(alias)) {
    throw new PaymentLinkConfigError(`${label} must be 1-64 characters of A-Z, a-z, 0-9, hyphen or underscore`);
  }
  if (!isSandbox && alias.toLowerCase() === SANDBOX_ALIAS.toLowerCase()) {
    throw new PaymentLinkConfigError(`${label} must not be the shared sandbox alias on a live host`);
  }
}

/**
 * Resolves the merchant alias.
 *
 * On a SANDBOX host an unset alias falls back to the shared sandbox alias, so
 * local development works with no setup. On a LIVE host there is NO fallback:
 * an unset alias is an error, because the alternative is takings landing in a
 * sandbox account, silently.
 */
export function getMayaLinkConfig(env: MayaLinkEnv): MayaLinkConfig {
  const { baseUrl, isSandbox } = readBase(env);

  const explicit = env[ALIAS_VAR]?.trim();
  let alias: string;
  if (explicit) {
    alias = explicit;
  } else if (isSandbox) {
    alias = SANDBOX_ALIAS;
  } else {
    throw new PaymentLinkConfigError(`${ALIAS_VAR} must be set explicitly when MAYA_PAYMENT_LINK_BASE_URL is a live host`);
  }

  checkAlias(alias, isSandbox, ALIAS_VAR);
  return { baseUrl, alias, isSandbox };
}

/**
 * Is the configured base URL a LIVE Maya host? Throws PaymentLinkConfigError on
 * an invalid or inconsistent base URL (so a caller fails closed). The checkout
 * route uses this to demand order persistence before any live link is issued.
 */
export function isLiveMayaHost(env: MayaLinkEnv): boolean {
  return !readBase(env).isSandbox;
}

/** `amountPesos` is WHOLE PESOS. A fractional total means something upstream is wrong. */
export function buildMayaPaymentLink(amountPesos: number, config: MayaLinkConfig): string {
  if (!Number.isFinite(amountPesos)) {
    throw new PaymentLinkConfigError('Payment amount must be a finite number');
  }
  if (!Number.isInteger(amountPesos)) {
    throw new PaymentLinkConfigError(`Payment amount must be whole pesos, got ${amountPesos}`);
  }
  if (amountPesos <= 0) {
    throw new PaymentLinkConfigError(`Payment amount must be greater than zero, got ${amountPesos}`);
  }
  if (amountPesos > MAX_AMOUNT_PESOS) throw new AmountTooLargeError(amountPesos);
  // Never trust the config's shape: re-derive everything from the allowlist.
  const { baseUrl, isSandbox } = parseBase(config.baseUrl, 'Payment link base URL');
  checkAlias(config.alias, isSandbox, 'Payment link alias');
  return `${baseUrl}/${encodeURIComponent(config.alias)}?amt=${amountPesos}`;
}
