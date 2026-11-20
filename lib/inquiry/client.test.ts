import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitInquiry } from './client';
import type { InquiryRequest } from './types';

const FALLBACK = 'We could not send your inquiry just now. Please try again in a moment.';

const req: InquiryRequest = {
  company: 'Casa Co',
  contactName: 'Ana Reyes',
  email: 'ana@example.com',
  phone: '',
  role: '',
  message: '',
  items: [{ productId: 'ja-fr-02', packId: 'pair', quantity: 2 }],
  website: '',
};

function mockFetch(impl: () => Promise<unknown>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}
const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe('submitInquiry', () => {
  it('returns the reference on 200', async () => {
    mockFetch(() => json(200, { reference: 'JAI-0123456789AB' }));
    expect(await submitInquiry(req)).toEqual({ ok: true, reference: 'JAI-0123456789AB' });
  });

  it.each([400, 429, 503])('returns the server message on %i', async (status) => {
    mockFetch(() => json(status, { error: `server said ${status}` }));
    expect(await submitInquiry(req)).toEqual({ ok: false, error: `server said ${status}` });
  });

  it('falls back when an error body has no message', async () => {
    mockFetch(() => json(503, {}));
    expect(await submitInquiry(req)).toEqual({ ok: false, error: FALLBACK });
  });

  it('does not report success on a 200 without a reference', async () => {
    mockFetch(() => json(200, {}));
    expect(await submitInquiry(req)).toEqual({ ok: false, error: FALLBACK });
  });

  it('falls back on a network failure', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await submitInquiry(req)).toEqual({ ok: false, error: FALLBACK });
  });

  it('falls back on a non-JSON body', async () => {
    mockFetch(() => Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }));
    expect(await submitInquiry(req)).toEqual({ ok: false, error: FALLBACK });
  });

  it('POSTs the request as JSON to /api/inquiry with nothing extra', async () => {
    const fn = mockFetch(() => json(200, { reference: 'JAI-0123456789AB' }));
    await submitInquiry(req);
    expect(fn).toHaveBeenCalledTimes(1);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/inquiry');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(req);
  });
});
