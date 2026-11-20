// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '@/components/layout/Footer';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts } from '@/lib/catalog/public';
import { landingParams } from '@/lib/shop/landing';
import { IMAGE_DISCLOSURE, SITE_NAME, TAGLINE } from '@/lib/site';

describe('Footer', () => {
  it('names the business and gives the tagline, with no founding year', () => {
    const { container } = render(<Footer />);
    expect(screen.getAllByText(new RegExp(SITE_NAME)).length).toBeGreaterThan(0);
    expect(screen.getByText(TAGLINE)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/since 20|founded|established|online since/i);
    expect(container.textContent).toContain(`© ${new Date().getFullYear()} ${SITE_NAME}`);
  });

  it('has no store-locator style links', () => {
    render(<Footer />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).not.toMatch(/stores?|locator|showroom|branch/i);
    }
  });

  it('invents no contact details: no mailto or tel link while the owner has set none', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull();
  });

  it('every shop link goes to a landing page that exists', () => {
    const live = new Set(landingParams(toPublicProducts(PRODUCTS)).map((p) => `/shop/${p.facet}/${p.value}`));
    render(<Footer />);
    const shopLinks = screen.getAllByRole('link').map((l) => l.getAttribute('href')!).filter((h) => h.startsWith('/shop/'));
    expect(shopLinks.length).toBeGreaterThan(0);
    for (const href of shopLinks) expect(live.has(href), href).toBe(true);
  });

  it('links to terms and privacy, and every link is 44px tall', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/privacy');
    for (const link of screen.getAllByRole('link')) expect(link.className, link.textContent ?? '').toContain('min-h-[44px]');
  });

  it('carries the image disclosure as a small caption, once, with no money wording', () => {
    render(<Footer />);
    const caption = screen.getByText(IMAGE_DISCLOSURE);
    expect(caption.tagName).toBe('P');
    expect(caption.className).toContain('text-xs');
    expect(screen.getAllByText(IMAGE_DISCLOSURE)).toHaveLength(1);
    expect(IMAGE_DISCLOSURE).not.toMatch(/price|pricing|peso|maya|₱/i);
  });
});
