import { describe, expect, it } from 'vitest';
import { checkoutPath, getCheckoutToken, isCheckoutOpen, isValidCheckoutToken } from './link';

const TOKEN = 'k9Xq2LmZ7pRt4VbN8cYw3HsA';

describe('getCheckoutToken (fail closed)', () => {
  it('is null when unset or blank', () => {
    expect(getCheckoutToken({})).toBeNull();
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: '   ' })).toBeNull();
  });

  it('is null when too short to be unguessable', () => {
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: 'abc123' })).toBeNull();
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: 'a'.repeat(23) })).toBeNull();
  });

  it('is null when not URL-safe, so a link can never need escaping', () => {
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: `${TOKEN}/../x` })).toBeNull();
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: `${TOKEN} x` })).toBeNull();
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: `${TOKEN}?a=b` })).toBeNull();
  });

  it('is null for a long but low-entropy token', () => {
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: 'a'.repeat(30) })).toBeNull();
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: 'ab'.repeat(15) })).toBeNull();
  });

  it('refuses the public development token on a live Maya host only', () => {
    const dev = 'devlink0123456789abcdefghij';
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: dev })).toBe(dev);
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: dev, MAYA_PAYMENT_LINK_BASE_URL: 'https://sandbox.mymaya.me' })).toBe(dev);
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: dev, MAYA_PAYMENT_LINK_BASE_URL: 'https://mymaya.me' })).toBeNull();
  });

  it('returns a valid token, trimmed', () => {
    expect(getCheckoutToken({ CHECKOUT_LINK_TOKEN: ` ${TOKEN} ` })).toBe(TOKEN);
    expect(isCheckoutOpen({ CHECKOUT_LINK_TOKEN: TOKEN })).toBe(true);
    expect(isCheckoutOpen({})).toBe(false);
  });
});

describe('isValidCheckoutToken', () => {
  const env = { CHECKOUT_LINK_TOKEN: TOKEN };

  it('accepts exactly the configured token', () => {
    expect(isValidCheckoutToken(TOKEN, env)).toBe(true);
  });

  it('rejects any other value, including near misses and the wrong type', () => {
    expect(isValidCheckoutToken(`${TOKEN}x`, env)).toBe(false);
    expect(isValidCheckoutToken(TOKEN.slice(1), env)).toBe(false);
    expect(isValidCheckoutToken(TOKEN.toLowerCase(), env)).toBe(false);
    expect(isValidCheckoutToken('', env)).toBe(false);
    expect(isValidCheckoutToken(undefined, env)).toBe(false);
    expect(isValidCheckoutToken(null, env)).toBe(false);
    expect(isValidCheckoutToken(123, env)).toBe(false);
    expect(isValidCheckoutToken({ toString: () => TOKEN }, env)).toBe(false);
  });

  it('rejects everything when no token is configured, even an empty candidate', () => {
    expect(isValidCheckoutToken(TOKEN, {})).toBe(false);
    expect(isValidCheckoutToken('', {})).toBe(false);
    expect(isValidCheckoutToken(undefined, {})).toBe(false);
  });

  it('rejects an absurdly long candidate without hashing it', () => {
    expect(isValidCheckoutToken('a'.repeat(100_000), env)).toBe(false);
  });
});

describe('checkoutPath', () => {
  it('builds the shareable path', () => {
    expect(checkoutPath(TOKEN)).toBe(`/checkout/${TOKEN}`);
  });
});
