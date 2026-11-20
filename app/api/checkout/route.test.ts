import { inspect } from 'node:util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';

vi.mock('@/lib/catalog/client', () => ({ fetchProductsByIds: vi.fn() }));
vi.mock('@/lib/server/orders', () => ({ recordOrder: vi.fn() }));

import { fetchProductsByIds } from '@/lib/catalog/client';
import { recordOrder } from '@/lib/server/orders';
import { POST } from '@/app/api/checkout/route';
import { CHECKOUT_RATE_LIMIT } from '@/lib/checkout/rate-limit';

const TOKEN = 'k9Xq2LmZ7pRt4VbN8cYw3HsA';
const customer = {
  company: 'Mabini Dining Corp.',
  contactName: 'Ana Reyes',
  email: 'ana@example.com',
  phone: '+63 917 000 0000',
  taxId: '000-000-000-000',
  poReference: 'PO-1042',
};
const address = {
  line1: '12 Mabini St',
  city: 'Quezon City',
  province: 'Metro Manila',
  postalCode: '1100',
  country: 'Philippines',
};
const fr01 = PRODUCTS.find((p) => p.id === 'ja-fr-01')!;
const pairPrice = fr01.packs.find((p) => p.id === 'pair')!.price;

function body(over: Record<string, unknown> = {}) {
  return {
    token: TOKEN,
    items: [{ productId: 'ja-fr-01', packId: 'pair', quantity: 2 }],
    customer,
    shippingAddress: address,
    ...over,
  };
}

let ipCounter = 0;
function post(payload: unknown, init: { headers?: Record<string, string>; raw?: string } = {}) {
  ipCounter += 1;
  return POST(
    new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `198.51.100.${ipCounter % 250}`,
        ...init.headers,
      },
      body: init.raw ?? JSON.stringify(payload),
    }),
  );
}

// A live Maya host refuses checkout unless order persistence is configured.
// Tests that exercise the live path configure it here; the values are fake.
function stubPersistence() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('CHECKOUT_LINK_TOKEN', TOKEN);
  vi.stubEnv('MAYA_PAYMENT_LINK_BASE_URL', '');
  vi.stubEnv('MAYA_MERCHANT_ALIAS', '');
  vi.mocked(fetchProductsByIds).mockReset();
  vi.mocked(fetchProductsByIds).mockImplementation(async (ids) => PRODUCTS.filter((p) => ids.includes(p.id)));
  vi.mocked(recordOrder).mockReset();
  vi.mocked(recordOrder).mockResolvedValue({ persisted: true });
});

describe('POST /api/checkout: the link token is the gate', () => {
  async function expectNotFound(res: Response) {
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordOrder).not.toHaveBeenCalled();
  }

  it('answers 404 {"error":"Not found"} when the body carries no token', async () => {
    await expectNotFound(await post(body({ token: undefined })));
  });

  it('answers 404 for a wrong token, a near miss and a non-string token', async () => {
    for (const token of ['wrong-token-wrong-token-wrong', `${TOKEN}x`, TOKEN.slice(1), TOKEN.toLowerCase(), '', 123, null, { a: 1 }, [TOKEN]]) {
      const res = await post(body({ token }));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not found' });
    }
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('is CLOSED when CHECKOUT_LINK_TOKEN is unset: even the right-looking token gets 404', async () => {
    vi.stubEnv('CHECKOUT_LINK_TOKEN', '');
    await expectNotFound(await post(body()));
  });

  it('is CLOSED when the configured token is too short or not URL-safe', async () => {
    vi.stubEnv('CHECKOUT_LINK_TOKEN', 'short');
    expect((await post(body({ token: 'short' }))).status).toBe(404);
    vi.stubEnv('CHECKOUT_LINK_TOKEN', `${TOKEN}/../x`);
    expect((await post(body({ token: `${TOKEN}/../x` }))).status).toBe(404);
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('a closed checkout and a wrong token answer with the IDENTICAL status and body', async () => {
    const wrong = await post(body({ token: 'wrong-token-wrong-token-wrong' }));
    const wrongText = await wrong.text();
    vi.stubEnv('CHECKOUT_LINK_TOKEN', '');
    const closed = await post(body());
    expect(closed.status).toBe(wrong.status);
    expect(await closed.text()).toBe(wrongText);
  });

  it('a body that is not JSON, or not an object, reveals nothing either: 404', async () => {
    expect((await post(null, { raw: '{not json' })).status).toBe(404);
    expect((await post([1, 2, 3])).status).toBe(404);
    expect((await post('text')).status).toBe(404);
    expect((await post(null)).status).toBe(404);
  });

  it('answers 200 with the right token', async () => {
    const res = await post(body());
    expect(res.status).toBe(200);
  });

  it('the token never reaches the order record or the logs', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    await post(body());
    expect(inspect(vi.mocked(recordOrder).mock.calls, { depth: 8 })).not.toContain(TOKEN);
    expect(inspect(info.mock.calls, { depth: 8 })).not.toContain(TOKEN);
    info.mockRestore();
  });
});

describe('POST /api/checkout: happy path', () => {
  it('prices from the server catalogue and returns a sandbox Maya link', async () => {
    const res = await post(body());
    expect(res.status).toBe(200);
    const json = await res.json();
    const total = pairPrice * 2;
    expect(json).toMatchObject({
      subtotal: total,
      shipping: 0,
      total,
      itemCount: 2,
      isDomestic: true,
      persisted: true,
      redirectUrl: `https://sandbox.mymaya.me/SbxInv?amt=${total}`,
    });
    expect(json.reference).toMatch(/^JA-[A-F0-9]{12}$/);
  });

  it('snapshots name, pack, finish and unit price onto the order, with the normalised B2B customer', async () => {
    await post(body());
    expect(recordOrder).toHaveBeenCalledOnce();
    const arg = vi.mocked(recordOrder).mock.calls[0][0];
    expect(arg).not.toHaveProperty('range');
    expect(arg.customer).toEqual({ ...customer, phone: '+639170000000' });
    expect(arg.shippingAddress).toEqual(address);
    expect(arg.totals).toEqual({
      subtotal: pairPrice * 2,
      shipping: 0,
      total: pairPrice * 2,
      itemCount: 2,
      isDomestic: true,
    });
    expect(arg.paymentLink).toBe(`https://sandbox.mymaya.me/SbxInv?amt=${pairPrice * 2}`);
    expect(arg.reference).toMatch(/^JA-[A-F0-9]{12}$/);
    expect(arg.lines).toEqual([
      {
        productId: 'ja-fr-01',
        productName: 'Himig 6',
        packId: 'pair',
        packLabel: 'Matched pair',
        packUnits: 2,
        finishName: 'Matte Black',
        unitPrice: pairPrice,
        quantity: 2,
      },
    ]);
  });

  it('accepts a customer with only the required fields', async () => {
    const res = await post(body({ customer: { company: 'Mabini Dining Corp.', contactName: 'Ana Reyes', email: 'ana@example.com' } }));
    expect(res.status).toBe(200);
  });

  it('the pack price comes from the SERVER, never from the request (a price in the body is ignored)', async () => {
    const res = await post(
      body({
        total: 1,
        subtotal: 1,
        items: [{ productId: 'ja-fr-01', packId: 'pair', quantity: 2, price: 1, unitPrice: 1 }],
      }),
    );
    expect((await res.json()).total).toBe(pairPrice * 2);
  });

  it('prices a different pack of the same product from that pack, not from the first', async () => {
    const pack4 = fr01.packs.find((p) => p.id === 'pack-4')!.price;
    const res = await post(body({ items: [{ productId: 'ja-fr-01', packId: 'pack-4', quantity: 1 }] }));
    expect((await res.json()).total).toBe(pack4);
    expect(pack4).not.toBe(pairPrice);
  });

  it('merges duplicate product+pack lines', async () => {
    const res = await post(
      body({
        items: [
          { productId: 'ja-fr-01', packId: 'pair', quantity: 1 },
          { productId: 'ja-fr-01', packId: 'pair', quantity: 2 },
        ],
      }),
    );
    expect((await res.json()).itemCount).toBe(3);
  });

  it('one order can span the whole catalogue: any category, any product', async () => {
    const res = await post(
      body({
        items: [
          { productId: 'ja-fr-01', packId: 'single', quantity: 1 },
          { productId: 'ja-am-01', packId: 'single', quantity: 1 },
          { productId: 'ja-ou-02', packId: 'pair', quantity: 1 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(recordOrder).mock.calls[0][0].lines.map((l) => l.productId)).toEqual(['ja-fr-01', 'ja-am-01', 'ja-ou-02']);
  });

  it('accepts an international address with no province and reports isDomestic:false', async () => {
    const res = await post(body({ shippingAddress: { ...address, country: 'Spain', province: '' } }));
    expect(res.status).toBe(200);
    expect((await res.json()).isDomestic).toBe(false);
  });

  it('still returns 200 with the link when order persistence times out', async () => {
    vi.mocked(recordOrder).mockResolvedValue({ persisted: false, reason: 'timeout' });
    const res = await post(body());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.persisted).toBe(false);
    expect(json.redirectUrl).toBe(`https://sandbox.mymaya.me/SbxInv?amt=${pairPrice * 2}`);
  });

  it('still succeeds, honestly reporting persisted:false, when the order cannot be saved', async () => {
    vi.mocked(recordOrder).mockResolvedValue({ persisted: false, reason: 'no-service-key' });
    const res = await post(body());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.persisted).toBe(false);
    expect(json.redirectUrl).toContain('https://sandbox.mymaya.me/');
  });

  it('logs no customer or address details', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    await post(body());
    // util.inspect, not JSON.stringify: stringify turns an Error into {} and would hide its message and stack.
    const logged = inspect(spy.mock.calls, { depth: 8, breakLength: Infinity });
    expect(logged).toContain('payment link issued'); // positive control: the log really was captured
    for (const pii of ['ana@example.com', 'Mabini', 'Reyes', '000-000-000-000', 'PO-1042', 'Dining']) {
      expect(logged).not.toContain(pii);
    }
    spy.mockRestore();
  });
});

describe('POST /api/checkout: rejections', () => {
  const cases: [string, Record<string, unknown>, number, RegExp][] = [
    ['empty basket', { items: [] }, 400, /at least one item/],
    ['oversized basket', { items: Array.from({ length: 51 }, (_, i) => ({ productId: `x${i}`, packId: 'single', quantity: 1 })) }, 400, /more than 50/],
    ['fractional quantity', { items: [{ productId: 'ja-fr-01', packId: 'single', quantity: 1.5 }] }, 400, /integer quantity/],
    ['string quantity', { items: [{ productId: 'ja-fr-01', packId: 'single', quantity: '2' }] }, 400, /integer quantity/],
    ['zero quantity', { items: [{ productId: 'ja-fr-01', packId: 'single', quantity: 0 }] }, 400, /between 1 and 20/],
    ['quantity above the ceiling', { items: [{ productId: 'ja-fr-01', packId: 'single', quantity: 21 }] }, 400, /between 1 and 20/],
    [
      'quantity split across packs to dodge the ceiling',
      { items: [{ productId: 'ja-fr-01', packId: 'single', quantity: 15 }, { productId: 'ja-fr-01', packId: 'pair', quantity: 15 }] },
      400,
      /may not exceed 20/,
    ],
    ['an item with the retired sizeId field instead of packId', { items: [{ productId: 'ja-fr-01', sizeId: 'single', quantity: 1 }] }, 400, /packId/],
    ['missing customer', { customer: undefined }, 400, /Customer details/],
    ['missing company', { customer: { ...customer, company: '' } }, 400, /Company is required/],
    ['missing contact name', { customer: { ...customer, contactName: '' } }, 400, /Contact name is required/],
    ['missing email', { customer: { ...customer, email: '' } }, 400, /Email is required/],
    ['malformed email', { customer: { ...customer, email: 'not-an-email' } }, 400, /does not look right/],
    ['malformed phone', { customer: { ...customer, phone: 'call me' } }, 400, /phone number does not look right/],
    ['newline in the PO reference', { customer: { ...customer, poReference: 'PO\nBcc: x' } }, 400, /PO reference contains characters/],
    ['missing address', { shippingAddress: undefined }, 400, /shipping address/],
    ['unrecognised country', { shippingAddress: { ...address, country: 'Philipines' } }, 400, /not a country we recognise/],
    ['embargoed country', { shippingAddress: { ...address, country: 'Cuba' } }, 400, /not able to ship/],
    ['domestic order without a province', { shippingAddress: { ...address, province: '' } }, 400, /Province is required/],
    ['unknown product', { items: [{ productId: 'ja-zz-99', packId: 'single', quantity: 1 }] }, 409, /no longer sold/],
    ['a pack the product does not offer', { items: [{ productId: 'ja-am-01', packId: 'pack-10', quantity: 1 }] }, 400, /Lakas D4-600 is no longer offered in the pack you chose/],
    ['a pack id that exists nowhere', { items: [{ productId: 'ja-fr-01', packId: 'crate-of-99', quantity: 1 }] }, 400, /no longer offered in the pack/],
  ];

  it.each(cases)('rejects %s', async (_label, over, status, message) => {
    const res = await post(body(over));
    expect(res.status).toBe(status);
    expect((await res.json()).error).toMatch(message);
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('rejects an out-of-stock product with 409', async () => {
    vi.mocked(fetchProductsByIds).mockResolvedValue([{ ...fr01, inStock: false }]);
    const res = await post(body());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/out of stock/);
  });

  it('error messages name products, never raw ids (unknown ids become "an item that is no longer sold")', async () => {
    const unknown = await post(body({ items: [{ productId: 'ja-zz-99', packId: 'single', quantity: 1 }] }));
    const unknownMessage = (await unknown.json()).error as string;
    expect(unknownMessage).toBe('Your order includes an item that is no longer sold.');
    expect(unknownMessage).not.toContain('ja-zz-99');

    const two = await post(
      body({
        items: [
          { productId: 'ja-zz-98', packId: 'single', quantity: 1 },
          { productId: 'ja-zz-99', packId: 'single', quantity: 1 },
        ],
      }),
    );
    const twoMessage = (await two.json()).error as string;
    expect(twoMessage).toBe('Your order includes 2 items that are no longer sold.');
    expect(twoMessage).not.toMatch(/ja-zz/);

    const pack = await post(body({ items: [{ productId: 'ja-am-01', packId: 'pack-10', quantity: 1 }] }));
    const packMessage = (await pack.json()).error as string;
    expect(packMessage).toContain('Lakas D4-600');
    expect(packMessage).not.toContain('pack-10');
  });

  it('the unknown-pack 400 also tells the customer to reload (the page they are on is stale)', async () => {
    const res = await post(body({ items: [{ productId: 'ja-am-01', packId: 'pack-10', quantity: 1 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no longer offered in the pack you chose. Reload this page to refresh your order.$/);
  });

  it('the out-of-stock list names each product once, even when two packs of it are in the basket', async () => {
    vi.mocked(fetchProductsByIds).mockResolvedValue([{ ...fr01, inStock: false }]);
    const res = await post(
      body({
        items: [
          { productId: 'ja-fr-01', packId: 'single', quantity: 1 },
          { productId: 'ja-fr-01', packId: 'pair', quantity: 1 },
        ],
      }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(`These items are out of stock: ${fr01.name}`);
  });

  it('carries no storefront or range concept: an unknown extra field is simply ignored', async () => {
    const res = await post(body({ storefront: 'handmade', range: 'outdoor' }));
    expect(res.status).toBe(200);
    expect(vi.mocked(recordOrder).mock.calls[0][0]).not.toHaveProperty('range');
  });
});

describe('POST /api/checkout: request hardening', () => {
  it('rejects a non-JSON content type with 415, before any lookup or write', async () => {
    const res = await post(body(), { headers: { 'content-type': 'text/plain' } });
    expect(res.status).toBe(415);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('rejects an oversized body with 413, before any lookup or write', async () => {
    const res = await post(null, { raw: JSON.stringify({ pad: 'x'.repeat(70_000) }) });
    expect(res.status).toBe(413);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('rejects a chunked body with no content-length mid-stream, and cancels the stream', async () => {
    const state = { pulled: 0, cancelled: false };
    const chunk = new Uint8Array(8 * 1024).fill(120);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (state.pulled >= 1000) return controller.close();
        state.pulled += 1;
        controller.enqueue(chunk);
      },
      cancel() {
        state.cancelled = true;
      },
    });
    ipCounter += 1;
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${ipCounter % 250}` },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    expect(req.headers.get('content-length')).toBeNull();
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(state.pulled).toBeLessThan(50);
    expect(state.cancelled).toBe(true);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
  });

  it('counts bytes, not characters: a 120KB body of 40k multi-byte characters gets 413', async () => {
    const res = await post(null, { raw: JSON.stringify({ pad: '€'.repeat(40_000) }) });
    expect(res.status).toBe(413);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
  });

  it('rate-limits one IP with 429 and Retry-After after the per-minute limit, before the token is even checked', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.99' };
    const statuses: number[] = [];
    // The effective limit is read from the module, so an environment override
    // of CHECKOUT_RATE_LIMIT_PER_MIN cannot make this test lie.
    for (let i = 0; i < CHECKOUT_RATE_LIMIT; i += 1) statuses.push((await post(body(), { headers })).status);
    expect(statuses.every((s) => s === 200)).toBe(true);

    vi.mocked(fetchProductsByIds).mockClear();
    vi.mocked(recordOrder).mockClear();
    const limited = await post(body(), { headers });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect((await post(body({ token: 'nope' }), { headers })).status).toBe(429);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/checkout: Maya configuration', () => {
  it('a live host with no alias fails closed with 503, no link and no leaked config', async () => {
    stubPersistence();
    vi.stubEnv('MAYA_PAYMENT_LINK_BASE_URL', 'https://mymaya.me');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(body());
    expect(res.status).toBe(503);
    const text = await res.text();
    const json = JSON.parse(text);
    expect(json.redirectUrl).toBeUndefined();
    expect(json.error).toMatch(/temporarily unavailable/i);
    // The internal config message can echo the base URL or alias: never in a response.
    expect(text).not.toMatch(/mymaya/i);
    expect(recordOrder).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a live host never falls back to the sandbox alias, and rejects SbxInv', async () => {
    stubPersistence();
    vi.stubEnv('MAYA_PAYMENT_LINK_BASE_URL', 'https://mymaya.me');
    vi.stubEnv('MAYA_MERCHANT_ALIAS', 'SbxInv');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(body());
    expect(res.status).toBe(503);
    expect(await res.text()).not.toMatch(/SbxInv|mymaya/i);
    expect(recordOrder).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a blank base URL with an alias configured fails closed with 503', async () => {
    vi.stubEnv('MAYA_MERCHANT_ALIAS', 'TEST-ALIAS');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(body());
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('TEST-ALIAS');
    expect(recordOrder).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('uses the one live alias when everything is configured', async () => {
    stubPersistence();
    vi.stubEnv('MAYA_PAYMENT_LINK_BASE_URL', 'https://mymaya.me');
    vi.stubEnv('MAYA_MERCHANT_ALIAS', 'TEST-ALIAS');
    const json = await (await post(body())).json();
    expect(json.redirectUrl).toBe(`https://mymaya.me/TEST-ALIAS?amt=${pairPrice * 2}`);
  });

  describe('a live Maya host refuses checkout unless order persistence is configured', () => {
    function stubLiveMaya() {
      vi.stubEnv('MAYA_PAYMENT_LINK_BASE_URL', 'https://mymaya.me');
      vi.stubEnv('MAYA_MERCHANT_ALIAS', 'TEST-ALIAS');
    }

    async function expectRefused(res: Response) {
      expect(res.status).toBe(503);
      const text = await res.text();
      const json = JSON.parse(text);
      expect(json.redirectUrl).toBeUndefined();
      expect(json.error).toMatch(/temporarily unavailable/i);
      expect(text).not.toMatch(/mymaya|supabase|TEST-ALIAS/i);
      expect(recordOrder).not.toHaveBeenCalled();
    }

    it('a live host with NO database configured returns 503 and no redirectUrl', async () => {
      stubLiveMaya();
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expectRefused(await post(body()));
      err.mockRestore();
    });

    it('a live host with only the public pair (no service-role key) returns 503', async () => {
      stubLiveMaya();
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expectRefused(await post(body()));
      expect(fetchProductsByIds).not.toHaveBeenCalled();
      err.mockRestore();
    });

    it('a live host with only the service-role key returns 503', async () => {
      stubLiveMaya();
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expectRefused(await post(body()));
      err.mockRestore();
    });

    it('a half-set public pair on a live host also returns 503 (never a paid order with nowhere to go)', async () => {
      stubLiveMaya();
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expectRefused(await post(body()));
      err.mockRestore();
    });

    it('logs the missing variable NAMES, never values', async () => {
      stubLiveMaya();
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      await post(body());
      const logged = err.mock.calls.map((c) => c.map((a) => String(a)).join(' ')).join('\n');
      expect(logged).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(logged).not.toContain('test-anon-key');
      expect(logged).not.toContain('test-project');
      err.mockRestore();
    });

    it('a live host with the URL, anon key and service-role key all set returns 200', async () => {
      stubLiveMaya();
      stubPersistence();
      const res = await post(body());
      expect(res.status).toBe(200);
      expect((await res.json()).redirectUrl).toBe(`https://mymaya.me/TEST-ALIAS?amt=${pairPrice * 2}`);
      expect(recordOrder).toHaveBeenCalledOnce();
    });

    it('a runtime database failure stays best-effort on a live host: 200 with persisted:false', async () => {
      stubLiveMaya();
      stubPersistence();
      vi.mocked(recordOrder).mockResolvedValue({ persisted: false, reason: 'timeout' });
      const res = await post(body());
      expect(res.status).toBe(200);
      expect((await res.json()).persisted).toBe(false);
    });

    it('a SANDBOX host without a database is unchanged: 200 with persisted:false', async () => {
      vi.mocked(recordOrder).mockResolvedValue({ persisted: false, reason: 'no-service-key' });
      const res = await post(body());
      expect(res.status).toBe(200);
      expect((await res.json()).persisted).toBe(false);
    });
  });

  it('an over-ceiling basket gets a specific 422, not the generic 503', async () => {
    vi.mocked(fetchProductsByIds).mockResolvedValue([
      { ...fr01, packs: fr01.packs.map((p) => ({ ...p, price: 9_000_000 })) },
    ]);
    const res = await post(body());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(
      'This order is too large to pay in one go. Please split it into smaller orders or contact us.',
    );
    expect(recordOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/checkout: infrastructure failures stay generic', () => {
  it('maps SupabaseConfigError to the generic 503', async () => {
    const failure = new Error('internal detail: https://project.supabase.co misconfigured');
    failure.name = 'SupabaseConfigError';
    vi.mocked(fetchProductsByIds).mockRejectedValue(failure);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(body());
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text).error).toBe('Checkout is temporarily unavailable. Please try again shortly.');
    expect(text).not.toContain('supabase');
    expect(recordOrder).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('POST /api/checkout: error logs carry no customer data', () => {
  it.each([
    ['503 (database config)', () => Object.assign(new Error('db down'), { name: 'SupabaseConfigError' }), 503],
    ['500 (unexpected)', () => new Error('kaput'), 500],
  ])('console.error on a %s path has no email, name, company or address', async (_label, makeError, status) => {
    vi.mocked(fetchProductsByIds).mockRejectedValue(makeError());
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(body());
    expect(res.status).toBe(status);
    expect(spy).toHaveBeenCalled();
    // util.inspect keeps an Error's message AND stack, which JSON.stringify drops (it prints {}).
    const logged = inspect(spy.mock.calls, { depth: 8, breakLength: Infinity });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('db down'); // proves stringify alone would have missed it
    expect(logged).toMatch(/db down|kaput/); // positive control: the error text IS in what we scan
    expect(logged).toMatch(/\n\s+at /); // ...and so is the stack
    for (const pii of ['ana@example.com', 'Ana Reyes', 'Mabini', 'Quezon', '000-000-000-000', TOKEN]) {
      expect(logged).not.toContain(pii);
    }
    spy.mockRestore();
  });
});
