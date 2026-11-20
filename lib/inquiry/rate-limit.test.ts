import { afterEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return import('@/lib/inquiry/rate-limit');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('inquiry rate limit', () => {
  it('defaults to 5 per minute', async () => {
    vi.stubEnv('INQUIRY_RATE_LIMIT_PER_MIN', '');
    const { INQUIRY_RATE_LIMIT, inquiryLimiter } = await load();
    expect(INQUIRY_RATE_LIMIT).toBe(5);
    const results = [1, 2, 3, 4, 5, 6].map(() => inquiryLimiter.allow('203.0.113.9'));
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it('honours INQUIRY_RATE_LIMIT_PER_MIN', async () => {
    vi.stubEnv('INQUIRY_RATE_LIMIT_PER_MIN', '2');
    const { INQUIRY_RATE_LIMIT, inquiryLimiter } = await load();
    expect(INQUIRY_RATE_LIMIT).toBe(2);
    expect([1, 2, 3].map(() => inquiryLimiter.allow('203.0.113.10'))).toEqual([true, true, false]);
  });

  it.each(['0', '-3', '2.5', 'abc'])('falls back to 5 for the invalid value %j', async (value) => {
    vi.stubEnv('INQUIRY_RATE_LIMIT_PER_MIN', value);
    const { INQUIRY_RATE_LIMIT } = await load();
    expect(INQUIRY_RATE_LIMIT).toBe(5);
  });

  it('is independent of the checkout limiter', async () => {
    vi.stubEnv('INQUIRY_RATE_LIMIT_PER_MIN', '1');
    const { inquiryLimiter } = await load();
    const checkout = await import('@/lib/checkout/rate-limit');
    expect(inquiryLimiter).not.toBe(checkout.checkoutLimiter);
  });
});
