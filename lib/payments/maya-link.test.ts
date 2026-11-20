import { describe, expect, it } from 'vitest';
import { MAYA_ALLOWED_HOSTS, MAYA_SANDBOX_HOSTS } from '@/lib/payments/maya-hosts';
import {
  ALIAS_VAR,
  AmountTooLargeError,
  MAX_AMOUNT_PESOS,
  PaymentLinkConfigError,
  buildMayaPaymentLink,
  getMayaLinkConfig,
  isLiveMayaHost,
} from '@/lib/payments/maya-link';

const LIVE = { MAYA_PAYMENT_LINK_BASE_URL: 'https://mymaya.me' };
const SANDBOX = { MAYA_PAYMENT_LINK_BASE_URL: 'https://sandbox.mymaya.me' };
const ALIAS = 'MAYA_MERCHANT_ALIAS';

describe('getMayaLinkConfig', () => {
  it('reads ONE alias variable, MAYA_MERCHANT_ALIAS', () => {
    expect(ALIAS_VAR).toBe('MAYA_MERCHANT_ALIAS');
  });

  it('defaults to the sandbox host and the shared sandbox alias', () => {
    expect(getMayaLinkConfig({})).toEqual({
      baseUrl: 'https://sandbox.mymaya.me',
      alias: 'SbxInv',
      isSandbox: true,
    });
  });

  it('uses the configured alias on an EXPLICIT sandbox host', () => {
    expect(getMayaLinkConfig({ ...SANDBOX, [ALIAS]: 'TEST-ALIAS' }).alias).toBe('TEST-ALIAS');
  });

  it('never reads the retired per-range or shared-alias variables', () => {
    const env = {
      ...LIVE,
      MAYA_MERCHANT_ALIAS_HANDMADE: 'A1',
      MAYA_SHARED_MERCHANT_ALIAS: 'A2',
    };
    expect(() => getMayaLinkConfig(env)).toThrow(/MAYA_MERCHANT_ALIAS must be set/);
  });

  describe('a live alias never rides a silently-sandbox link', () => {
    it('pure sandbox dev (no alias, blank or unset base URL) still works', () => {
      expect(getMayaLinkConfig({}).isSandbox).toBe(true);
      expect(getMayaLinkConfig({ MAYA_PAYMENT_LINK_BASE_URL: '   ', [ALIAS]: ' ' }).isSandbox).toBe(true);
    });

    it('a blank base URL with an alias configured fails closed, with the documented message', () => {
      for (const env of [{ [ALIAS]: 'TEST-ALIAS' }, { MAYA_PAYMENT_LINK_BASE_URL: '', [ALIAS]: 'TEST-ALIAS' }]) {
        expect(() => getMayaLinkConfig(env)).toThrow(PaymentLinkConfigError);
        expect(() => getMayaLinkConfig(env)).toThrow(/set MAYA_PAYMENT_LINK_BASE_URL explicitly when a merchant alias is configured/);
        expect(() => isLiveMayaHost(env)).toThrow(PaymentLinkConfigError);
      }
    });

    it('an explicit base URL (sandbox or live) with an alias is accepted', () => {
      expect(getMayaLinkConfig({ ...SANDBOX, [ALIAS]: 'TEST-ALIAS' }).alias).toBe('TEST-ALIAS');
      expect(getMayaLinkConfig({ ...LIVE, [ALIAS]: 'TEST-ALIAS' }).isSandbox).toBe(false);
    });
  });

  it('a LIVE host with no alias fails closed: there is no fallback to the sandbox alias', () => {
    expect(() => getMayaLinkConfig(LIVE)).toThrow(PaymentLinkConfigError);
    expect(() => getMayaLinkConfig(LIVE)).toThrow(/MAYA_MERCHANT_ALIAS/);
    expect(() => getMayaLinkConfig({ ...LIVE, [ALIAS]: '   ' })).toThrow(PaymentLinkConfigError);
  });

  it('uses the alias on a live host', () => {
    expect(getMayaLinkConfig({ ...LIVE, [ALIAS]: 'TEST-ALIAS' })).toEqual({
      baseUrl: 'https://mymaya.me',
      alias: 'TEST-ALIAS',
      isSandbox: false,
    });
  });

  it('accepts the legacy paymaya.me hosts', () => {
    const cfg = getMayaLinkConfig({ MAYA_PAYMENT_LINK_BASE_URL: 'https://paymaya.me', [ALIAS]: 'A1' });
    expect(cfg.baseUrl).toBe('https://paymaya.me');
    expect(cfg.isSandbox).toBe(false);
  });

  it.each([
    ['http scheme', 'http://mymaya.me'],
    ['an unlisted host', 'https://evil.example'],
    ['credentials in the URL', 'https://evil.com@mymaya.me'],
    ['a look-alike host', 'https://mymaya.me.evil.example'],
    ['not a URL', 'mymaya'],
  ])('rejects %s', (_label, baseUrl) => {
    expect(() => getMayaLinkConfig({ MAYA_PAYMENT_LINK_BASE_URL: baseUrl, [ALIAS]: 'A1' })).toThrow(PaymentLinkConfigError);
  });

  it.each(['../x', 'a b', 'a/b', 'a?b', 'a@b', 'x'.repeat(65)])('rejects the unsafe alias %j', (alias) => {
    expect(() => getMayaLinkConfig({ ...SANDBOX, [ALIAS]: alias })).toThrow(PaymentLinkConfigError);
  });
});

describe('getMayaLinkConfig base-URL strictness', () => {
  const base = (url: string) => getMayaLinkConfig({ MAYA_PAYMENT_LINK_BASE_URL: url, [ALIAS]: 'A1' });

  it.each([
    ['a non-default port', 'https://mymaya.me:444'],
    ['port zero', 'https://mymaya.me:0'],
    ['a path', 'https://mymaya.me/x'],
    ['a query', 'https://mymaya.me/?a=1'],
    ['a fragment', 'https://mymaya.me/#frag'],
    ['a trailing-dot host', 'https://mymaya.me.'],
    ['password-only credentials', 'https://:pw@mymaya.me'],
  ])('rejects %s', (_label, url) => {
    expect(() => base(url)).toThrow(PaymentLinkConfigError);
  });

  it('accepts the bare host with or without a trailing slash', () => {
    expect(base('https://mymaya.me').baseUrl).toBe('https://mymaya.me');
    expect(base('https://mymaya.me/').baseUrl).toBe('https://mymaya.me');
  });

  it('normalises an upper-case URL and never emits a port', () => {
    expect(base('HTTPS://MYMAYA.ME').baseUrl).toBe('https://mymaya.me');
    expect(base('https://mymaya.me:443').baseUrl).toBe('https://mymaya.me');
  });
});

describe('getMayaLinkConfig alias rules', () => {
  it('accepts a 64-character alias', () => {
    const alias = 'x'.repeat(64);
    expect(getMayaLinkConfig({ ...SANDBOX, [ALIAS]: alias }).alias).toBe(alias);
  });

  it.each(['SbxInv', 'sbxinv', 'SBXINV'])(
    'rejects the shared sandbox alias %s on a LIVE host, but allows it on a sandbox host',
    (alias) => {
      expect(() => getMayaLinkConfig({ ...LIVE, [ALIAS]: alias })).toThrow(PaymentLinkConfigError);
      expect(getMayaLinkConfig({ ...SANDBOX, [ALIAS]: alias }).alias).toBe(alias);
    },
  );
});

describe('host sets are immutable', () => {
  it('cannot be extended or cleared at runtime', () => {
    expect(() => (MAYA_ALLOWED_HOSTS as Set<string>).add('evil.example')).toThrow(TypeError);
    expect(() => (MAYA_ALLOWED_HOSTS as Set<string>).delete('mymaya.me')).toThrow(TypeError);
    expect(() => (MAYA_ALLOWED_HOSTS as Set<string>).clear()).toThrow(TypeError);
    expect(() => (MAYA_SANDBOX_HOSTS as Set<string>).add('mymaya.me')).toThrow(TypeError);
    expect(MAYA_ALLOWED_HOSTS.has('evil.example')).toBe(false);
    expect(MAYA_ALLOWED_HOSTS.has('mymaya.me')).toBe(true);
    expect(MAYA_SANDBOX_HOSTS.has('mymaya.me')).toBe(false);
  });
});

describe('isLiveMayaHost', () => {
  it('is false for a sandbox or blank base URL, true for a live host', () => {
    expect(isLiveMayaHost({})).toBe(false);
    expect(isLiveMayaHost({ MAYA_PAYMENT_LINK_BASE_URL: 'https://sandbox.mymaya.me' })).toBe(false);
    expect(isLiveMayaHost({ MAYA_PAYMENT_LINK_BASE_URL: 'https://mymaya.me' })).toBe(true);
    expect(isLiveMayaHost({ MAYA_PAYMENT_LINK_BASE_URL: 'https://paymaya.me' })).toBe(true);
  });
  it('throws on an invalid base URL, so checkout fails closed', () => {
    expect(() => isLiveMayaHost({ MAYA_PAYMENT_LINK_BASE_URL: 'https://evil.example' })).toThrow(PaymentLinkConfigError);
  });
});

describe('buildMayaPaymentLink', () => {
  const cfg = { baseUrl: 'https://sandbox.mymaya.me', alias: 'SbxInv', isSandbox: true };

  it('builds https://<host>/<alias>?amt=<whole pesos> and no other query parameter', () => {
    const link = buildMayaPaymentLink(76_800, cfg);
    expect(link).toBe('https://sandbox.mymaya.me/SbxInv?amt=76800');
    expect([...new URL(link).searchParams.keys()]).toEqual(['amt']);
  });

  it.each([0, -0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects the amount %s', (amount) => {
    expect(() => buildMayaPaymentLink(amount, cfg)).toThrow(PaymentLinkConfigError);
  });

  it('treats an astronomically large amount as too large, not as misconfiguration', () => {
    expect(() => buildMayaPaymentLink(1e21, cfg)).toThrow(AmountTooLargeError);
  });

  it('re-validates the config instead of trusting it', () => {
    expect(() => buildMayaPaymentLink(100, { baseUrl: 'https://evil.com', alias: 'x', isSandbox: true })).toThrow(PaymentLinkConfigError);
    expect(() => buildMayaPaymentLink(100, { ...cfg, alias: '../x' })).toThrow(PaymentLinkConfigError);
    for (const baseUrl of [
      'https://sandbox.mymaya.me:444',
      'not a url',
      'http://sandbox.mymaya.me',
      'https://sandbox.mymaya.me/x',
      'https://u:p@sandbox.mymaya.me',
      'https://sandbox.mymaya.me?a=1',
    ]) {
      expect(() => buildMayaPaymentLink(100, { ...cfg, baseUrl })).toThrow(PaymentLinkConfigError);
    }
  });

  it('rejects the sandbox alias on a live host even in a hand-built config', () => {
    expect(() => buildMayaPaymentLink(100, { baseUrl: 'https://mymaya.me', alias: 'SbxInv', isSandbox: true })).toThrow(PaymentLinkConfigError);
  });

  it('allows exactly the ceiling and rejects one peso more with a DISTINCT error', () => {
    expect(buildMayaPaymentLink(MAX_AMOUNT_PESOS, cfg)).toContain(`amt=${MAX_AMOUNT_PESOS}`);
    let caught: unknown;
    try {
      buildMayaPaymentLink(MAX_AMOUNT_PESOS + 1, cfg);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AmountTooLargeError);
    expect(caught).not.toBeInstanceOf(PaymentLinkConfigError);
  });
});
