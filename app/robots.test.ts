import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('robots', () => {
  it('points at the sitemap with a single slash, stripping trailing slashes from SITE_URL like the sitemap does', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example.com///');
    const robots = (await import('@/app/robots')).default;
    expect(robots().sitemap).toBe('https://shop.example.com/sitemap.xml');
  });

  it('allows the public site and keeps the API and the checkout out of crawling', async () => {
    const robots = (await import('@/app/robots')).default;
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(['/api/', '/checkout/']);
  });
});
