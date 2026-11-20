import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock('next/navigation', () => nav);

import * as page from '@/app/product/[slug]/page';
import ProductRedirect from '@/app/product/[slug]/page';
import { PRODUCTS } from '@/lib/catalog/fixtures';

const run = (slug: string) => ProductRedirect({ params: Promise.resolve({ slug }) });

describe('/product/[slug] redirect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('permanently redirects an existing slug to the inquiry for that model', async () => {
    const slug = PRODUCTS[0].slug;
    await expect(run(slug)).rejects.toThrow(`NEXT_REDIRECT:/inquiry?product=${encodeURIComponent(slug)}`);
    expect(nav.permanentRedirect).toHaveBeenCalledWith(`/inquiry?product=${encodeURIComponent(slug)}`);
    expect(nav.notFound).not.toHaveBeenCalled();
  });

  it.each(['__proto__', 'constructor', '../x', 'a'.repeat(200), 'no-such-model'])('404s for %s', async (slug) => {
    await expect(run(slug)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(nav.notFound).toHaveBeenCalled();
    expect(nav.permanentRedirect).not.toHaveBeenCalled();
  });

  it('has no static params, revalidate or metadata: unknown slugs resolve at request time', () => {
    expect(Object.keys(page).sort()).toEqual(['default']);
  });
});
