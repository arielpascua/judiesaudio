import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';

vi.mock('@/lib/catalog/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/catalog/client')>()),
  fetchProductsByIds: vi.fn(),
}));
vi.mock('@/lib/server/inquiries', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/inquiries')>()),
  recordInquiry: vi.fn(),
}));

import { POST } from '@/app/api/inquiry/route';
import { fetchProductsByIds } from '@/lib/catalog/client';
import { INQUIRY_RATE_LIMIT } from '@/lib/inquiry/rate-limit';
import { SupabaseConfigError } from '@/lib/supabase/env';
import { InquiryUnavailableError, recordInquiry } from '@/lib/server/inquiries';

const fr02 = PRODUCTS.find((p) => p.id === 'ja-fr-02')!;
const pair = fr02.packs.find((p) => p.id === 'pair')!;

const COMPANY = 'Reyes Interiors';
const EMAIL = 'ana@reyesinteriors.example';

function body(over: Record<string, unknown> = {}) {
  return {
    company: COMPANY,
    contactName: 'Ana Reyes',
    email: EMAIL,
    phone: '+63 917 555 0100',
    role: 'Operations manager',
    message: 'We are fitting out a hotel lobby.',
    items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 4 }],
    ...over,
  };
}

let ipCounter = 0;
function post(payload: unknown, init: { headers?: Record<string, string>; raw?: string } = {}) {
  ipCounter += 1;
  return POST(
    new Request('http://localhost/api/inquiry', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `192.0.2.${ipCounter % 250}`,
        ...init.headers,
      },
      body: init.raw ?? JSON.stringify(payload),
    }),
  );
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(fetchProductsByIds).mockReset();
  vi.mocked(fetchProductsByIds).mockImplementation(async (ids) => PRODUCTS.filter((p) => ids.includes(p.id)));
  vi.mocked(recordInquiry).mockReset();
  vi.mocked(recordInquiry).mockResolvedValue(undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/inquiry: happy path (R-IQ-4, R-IQ-6, R-IQ-9)', () => {
  it('saves the inquiry and returns a JAI reference', async () => {
    const res = await post(body());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ reference: expect.stringMatching(/^JAI-[0-9A-F]{12}$/) });
    expect(recordInquiry).toHaveBeenCalledTimes(1);
  });

  it('snapshots name and pack from the catalogue, never from the request', async () => {
    const res = await post(
      body({
        items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 4, productName: 'Forged', packLabel: 'Forged', units: 99 }],
      }),
    );
    const { reference } = await res.json();
    const arg = vi.mocked(recordInquiry).mock.calls[0][0];
    expect(arg).toMatchObject({
      reference,
      company: COMPANY,
      contactName: 'Ana Reyes',
      email: EMAIL,
      phone: '+63 917 555 0100',
      role: 'Operations manager',
      message: 'We are fitting out a hotel lobby.',
    });
    expect(arg.lines).toEqual([
      {
        productId: 'ja-fr-02',
        productName: fr02.name,
        packId: 'pair',
        packLabel: pair.label,
        units: pair.units,
        quantity: 4,
      },
    ]);
    expect(inspect(arg, { depth: 8 })).not.toContain('Forged');
  });

  it('never hands a price to recordInquiry, and ignores price fields in the request', async () => {
    const res = await post(
      body({ price: 1, total: 1, items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 1, price: 1, unitPrice: 1 }] }),
    );
    expect(res.status).toBe(200);
    const arg = vi.mocked(recordInquiry).mock.calls[0][0];
    expect(JSON.stringify(arg).toLowerCase()).not.toContain('price');
    expect(JSON.stringify(await res.clone().json()).toLowerCase()).not.toContain('price');
  });

  it('accepts an out-of-stock model: inquiries may ask about it', async () => {
    vi.mocked(fetchProductsByIds).mockResolvedValue([{ ...fr02, inStock: false }]);
    const res = await post(body());
    expect(res.status).toBe(200);
    expect(recordInquiry).toHaveBeenCalledTimes(1);
  });

  it('accepts several packs of the same model', async () => {
    const res = await post(
      body({
        items: [
          { productId: 'ja-fr-02', packId: 'pair', quantity: 1 },
          { productId: 'ja-fr-02', packId: 'single', quantity: 2 },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(recordInquiry).mock.calls[0][0].lines).toHaveLength(2);
  });

  it('responds with the reference only: no contact data echoed', async () => {
    const res = await post(body());
    const text = await res.text();
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain(COMPANY);
    expect(res.headers.get('cache-control') ?? '').not.toContain('public');
  });
});

describe('POST /api/inquiry: logs never carry contact data (R-IQ-9)', () => {
  it('logs the reference and line count only', async () => {
    await post(body());
    const logged = [errorSpy, infoSpy].flatMap((s) => s.mock.calls.map((c) => inspect(c, { depth: 6 }))).join('\n');
    expect(infoSpy).toHaveBeenCalledWith('[inquiry] received', { reference: expect.stringMatching(/^JAI-/), lines: 1 });
    for (const secret of [COMPANY, 'Ana Reyes', EMAIL, '+63 917 555 0100', 'Operations manager', 'hotel lobby']) {
      expect(logged).not.toContain(secret);
    }
  });

  it('does not log contact data when a request is rejected or fails', async () => {
    vi.mocked(recordInquiry).mockRejectedValue(new InquiryUnavailableError('inquiry insert failed'));
    await post(body());
    await post(body({ email: 'not-an-email' }));
    const logged = [errorSpy, infoSpy].flatMap((s) => s.mock.calls.map((c) => inspect(c, { depth: 6 }))).join('\n');
    for (const secret of [COMPANY, 'Ana Reyes', EMAIL, '+63 917 555 0100', 'Operations manager', 'hotel lobby']) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe('POST /api/inquiry: validation reaches the client as 400', () => {
  it('invalid JSON', async () => {
    const res = await post(null, { raw: '{not json' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid JSON/);
    expect(recordInquiry).not.toHaveBeenCalled();
  });

  it.each([
    ['missing company', { company: '' }, /Company is required/],
    ['bad email', { email: 'a@b' }, /does not look right/],
    ['newline in name', { contactName: 'Ana\nReyes' }, /not allowed/],
    ['no items', { items: [] }, /at least one model/],
    ['quantity as a string', { items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: '3' }] }, /whole number/],
    ['too many lines', { items: Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, packId: 'pair', quantity: 1 })) }, /more than 20/],
    [
      'duplicate model and pack',
      { items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 1 }, { productId: 'ja-fr-02', packId: 'pair', quantity: 1 }] },
      /listed more than once/,
    ],
  ])('%s', async (_name, over, message) => {
    const res = await post(body(over));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(message);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordInquiry).not.toHaveBeenCalled();
  });

  it('a non-object JSON body', async () => {
    const res = await post(null, { raw: '[1,2]' });
    expect(res.status).toBe(400);
  });

  it('a filled honeypot gets the generic message and nothing is saved', async () => {
    const res = await post(body({ website: 'https://spam.example' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid request' });
    expect(recordInquiry).not.toHaveBeenCalled();
  });
});

describe('POST /api/inquiry: the catalogue decides what exists', () => {
  it('rejects an unknown product id with 400 "no longer listed"', async () => {
    const res = await post(body({ items: [{ productId: 'ja-nope', packId: 'pair', quantity: 1 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no longer listed/);
    expect(recordInquiry).not.toHaveBeenCalled();
  });

  it('treats a hostile __proto__ id as an unknown model', async () => {
    const res = await post(body({ items: [{ productId: '__proto__', packId: 'pair', quantity: 1 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no longer listed/);
    expect(({} as Record<string, unknown>).name).toBeUndefined();
  });

  it('rejects a pack the model does not offer, with the reload hint', async () => {
    const res = await post(body({ items: [{ productId: 'ja-fr-02', packId: 'pack-10', quantity: 1 }] }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toContain(fr02.name);
    expect(error).toMatch(/no longer offered in the pack you chose\. Please reload the page\./);
    expect(recordInquiry).not.toHaveBeenCalled();
  });
});

describe('POST /api/inquiry: failures are honest (Review Focus 2)', () => {
  const GENERIC = 'We could not send your inquiry just now. Please try again in a moment.';

  it('recordInquiry rejecting gives 503 with a generic message and no internals', async () => {
    vi.mocked(recordInquiry).mockRejectedValue(new InquiryUnavailableError('inquiry items insert failed'));
    const res = await post(body());
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: GENERIC });
    expect(text).not.toContain('insert');
    expect(text).not.toContain('JAI-');
  });

  it('an unexpected catalogue failure gives a generic 500 and leaks nothing', async () => {
    vi.mocked(fetchProductsByIds).mockRejectedValue(new Error('boom at https://secret.supabase.co'));
    const res = await post(body());
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('secret');
    expect(text).not.toContain('boom');
    expect(recordInquiry).not.toHaveBeenCalled();
  });

  it('a Supabase configuration error gives 503', async () => {
    vi.mocked(recordInquiry).mockRejectedValue(new SupabaseConfigError('half set'));
    const res = await post(body());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: GENERIC });
  });

  it('an unexpected error gives a generic 500', async () => {
    vi.mocked(recordInquiry).mockRejectedValue(new Error('boom: ana@reyesinteriors.example'));
    const res = await post(body());
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('boom');
    expect(text).not.toContain('JAI-');
    expect(inspect(errorSpy.mock.calls)).not.toContain(EMAIL);
  });
});

describe('POST /api/inquiry: request hardening', () => {
  it('rejects a non-JSON content type with 415, before any lookup or write', async () => {
    const res = await post(body(), { headers: { 'content-type': 'text/plain' } });
    expect(res.status).toBe(415);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordInquiry).not.toHaveBeenCalled();
  });

  it('rejects an oversized body with 413, before any lookup or write', async () => {
    const res = await post(null, { raw: JSON.stringify({ pad: 'x'.repeat(70_000) }) });
    expect(res.status).toBe(413);
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordInquiry).not.toHaveBeenCalled();
  });

  it('rate-limits one IP with 429 and Retry-After after the per-minute limit', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.77' };
    const statuses: number[] = [];
    for (let i = 0; i < INQUIRY_RATE_LIMIT; i += 1) statuses.push((await post(body(), { headers })).status);
    expect(statuses.every((s) => s === 200)).toBe(true);

    vi.mocked(fetchProductsByIds).mockClear();
    vi.mocked(recordInquiry).mockClear();
    const limited = await post(body(), { headers });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(fetchProductsByIds).not.toHaveBeenCalled();
    expect(recordInquiry).not.toHaveBeenCalled();
  });
});
