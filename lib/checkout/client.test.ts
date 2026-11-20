import { describe, expect, it, vi } from 'vitest';
import {
  CheckoutClientError,
  assertSafeRedirect,
  buildCheckoutPayload,
  submitCheckout,
} from '@/lib/checkout/client';
import type { CheckoutResponse } from '@/lib/checkout/types';

const customer = { company: 'Mabini Dining Corp.', contactName: 'Ana Reyes', email: 'ana@example.com' };
const TOKEN = 'k9Xq2LmZ7pRt4VbN8cYw3HsA';
const shippingAddress = { line1: '12 Mabini St', city: 'Quezon City', province: 'Metro Manila', postalCode: '1100', country: 'Philippines' };
const ok: CheckoutResponse = {
  reference: 'JA-ABCD12345678', subtotal: 100, shipping: 0, total: 100, itemCount: 1, isDomestic: true,
  redirectUrl: 'https://sandbox.mymaya.me/SbxInv?amt=100', persisted: true,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('buildCheckoutPayload (R-CK-3, consumer side)', () => {
  it('sends only ids, pack ids and quantities, even if lines carry extra fields', () => {
    const lines = [{ productId: 'ja-fr-01', packId: 'pair', quantity: 2, price: 1, name: 'x' }] as never;
    const payload = buildCheckoutPayload({ token: TOKEN, lines, customer, shippingAddress });
    expect(payload.items).toEqual([{ productId: 'ja-fr-01', packId: 'pair', quantity: 2 }]);
    expect(JSON.stringify(payload)).not.toMatch(/price|total|amount|subtotal/i);
  });

  it('carries the link token and the B2B customer, and nothing storefront-shaped', () => {
    const payload = buildCheckoutPayload({ token: TOKEN, lines: [], customer, shippingAddress });
    expect(payload.token).toBe(TOKEN);
    expect(payload.customer).toEqual(customer);
    expect(payload).not.toHaveProperty('storefront');
  });
});

describe('assertSafeRedirect', () => {
  it.each([
    'https://sandbox.mymaya.me/SbxInv?amt=1',
    'https://mymaya.me/TEST-ALIAS?amt=500',
    'https://paymaya.me/ABC?amt=5',
  ])('accepts %s', (url) => {
    expect(assertSafeRedirect(url)).toBe(url);
  });

  it.each([
    '',
    'not a url',
    'javascript:alert(1)',
    'http://mymaya.me/x?amt=1',
    'https://evil.example/x?amt=1',
    'https://mymaya.me.evil.example/x?amt=1',
    'https://user:pw@mymaya.me/x?amt=1',
    'https://mymaya.me:444/x?amt=1',
    'https://sandbox.mymaya.me:0/x?amt=1',
    'https://:pw@mymaya.me/x?amt=1',
    'https://mymaya.me./x?amt=1',
    'https://[::1]/x?amt=1',
  ])('rejects %j', (url) => {
    expect(() => assertSafeRedirect(url)).toThrow(CheckoutClientError);
  });

  it('lower-cases an upper-case allowlisted host', () => {
    expect(assertSafeRedirect('https://MYMAYA.ME/x?amt=1')).toBe('https://mymaya.me/x?amt=1');
  });

  it('a backslash-userinfo trick never yields a non-allowlisted host', () => {
    const raw = 'https://mymaya.me\\@evil.example/x?amt=1';
    let out: string | null = null;
    try {
      out = assertSafeRedirect(raw);
    } catch (e) {
      expect(e).toBeInstanceOf(CheckoutClientError);
    }
    if (out !== null) {
      const u = new URL(out);
      expect(['mymaya.me', 'sandbox.mymaya.me', 'paymaya.me', 'sandbox.paymaya.me']).toContain(u.hostname);
      expect(u.username).toBe('');
      expect(u.host).not.toMatch(/evil/);
    }
  });
});

describe('submitCheckout', () => {
  const req = buildCheckoutPayload({ token: TOKEN, lines: [{ productId: 'a', packId: 'single', quantity: 1 }], customer, shippingAddress });

  it('POSTs JSON to /api/checkout and returns the parsed response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(ok));
    await expect(submitCheckout(req, fetchImpl)).resolves.toEqual(ok);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/checkout');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual(req);
  });

  it('surfaces the server message and status on a non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ error: 'These items are out of stock: Himig 6' }, 409));
    await expect(submitCheckout(req, fetchImpl)).rejects.toMatchObject({
      name: 'CheckoutClientError', status: 409, message: 'These items are out of stock: Himig 6',
    });
  });

  it('turns a network failure into a friendly error', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('failed'));
    await expect(submitCheckout(req, fetchImpl)).rejects.toThrow(/reach the server/);
  });

  it('rejects a malformed success body and an unsafe redirect URL', async () => {
    await expect(submitCheckout(req, vi.fn().mockResolvedValue(json({ reference: 'x' })))).rejects.toThrow(/unexpected response/);
    await expect(
      submitCheckout(req, vi.fn().mockResolvedValue(json({ ...ok, redirectUrl: 'https://evil.example/x?amt=1' }))),
    ).rejects.toThrow(/not recognised/);
  });
});
