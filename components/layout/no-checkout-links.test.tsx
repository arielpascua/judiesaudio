// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { FACETS } from '@/lib/shop/facets';

// The checkout is reachable only through a private link. Nothing in the site chrome may point at it.
describe('site chrome never links to the checkout or the removed cart', () => {
  it.each([
    ['Header', async () => await Header()],
    ['Footer', async () => <Footer />],
    ['MobileNav', async () => <MobileNav facets={FACETS} />],
  ])('%s', async (_name, make) => {
    const { container } = render(await make());
    const hrefs = Array.from(container.querySelectorAll('[href]')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).not.toContain('/checkout');
      expect(href).not.toContain('/cart');
    }
  });
});
