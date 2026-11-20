import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts } from '@/lib/catalog/public';

vi.mock('@/lib/catalog/client', () => ({ fetchPublicProducts: vi.fn(async () => toPublicProducts(PRODUCTS)) }));

import sitemap from '@/app/sitemap';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('sitemap', () => {
  it('lists home, shop, landing pages, every model, about, help, inquiry and the legal pages', async () => {
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const p of ['/', '/shop', '/about', '/help', '/inquiry', '/legal/terms', '/legal/privacy']) expect(urls).toContain(p);
    expect(urls).toContain('/shop/category/ceiling');
    expect(urls).toContain('/shop/application/worship');
    for (const product of PRODUCTS) expect(urls).toContain(`/models/${product.slug}`);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('never lists the checkout, the cart, the old /product redirect, search or the API', async () => {
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const u of urls) expect(u).not.toMatch(/^\/(checkout|cart|product|search|api)(\/|$)/);
  });

  it('strips trailing slashes from SITE_URL so no URL has a double slash', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example.com///');
    const fresh = (await import('@/app/sitemap')).default;
    const entries = await fresh();
    for (const e of entries) {
      expect(e.url.startsWith('https://shop.example.com')).toBe(true);
      expect(e.url.slice('https://'.length)).not.toContain('//');
    }
    expect(entries.map((e) => e.url)).toContain('https://shop.example.com');
    expect(entries.map((e) => e.url)).toContain('https://shop.example.com/about');
  });
});
