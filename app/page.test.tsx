// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/page';
import { FEATURED_IDS } from '@/lib/catalog/featured';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { FAMILIES } from '@/lib/home';

// The catalogue is code, so the page reads the bundled fixtures.

const MONEY = /₱|price|pricing|peso|maya|pay with|payment|\bpaid\b/i;

describe('home page (R-B2B-1)', () => {
  it('shows no peso amount, price, Maya or payment wording anywhere on the page', async () => {
    const { container } = render(await HomePage());
    expect(container.textContent).not.toMatch(MONEY);
    expect(container.innerHTML).not.toMatch(/₱/);
  });

  it('carries nothing from the rug store', async () => {
    const { container } = render(await HomePage());
    expect(container.textContent).not.toMatch(/taruuv|\brugs?\b|carpet/i);
  });

  it('invents no fact and promises no time, quote or checkout', async () => {
    const { container } = render(await HomePage());
    expect(container.textContent).not.toMatch(/since 20|years of experience|trusted by|\bISO\b|warranty|within \d|same day|free quote|checkout/i);
  });

  it('the hero has the headline, Browse the datasheets and Send an inquiry, and no image', async () => {
    const { container } = render(await HomePage());
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')?.textContent).toBe('Commercial audio, specified on the datasheet.');
    expect(container.querySelector('a[href="/shop"].btn-primary')?.textContent).toBe('Browse the datasheets');
    expect(container.querySelector('a[href="/inquiry"].btn-quiet')?.textContent).toBe('Send an inquiry');
    expect(container.querySelector('section[aria-labelledby="hero-title"] img')).toBeNull();
  });

  it('the hero signal panel is decorative: aria-hidden, labelled as an illustration, with a meter and a real model curve', async () => {
    const { container } = render(await HomePage());
    const panel = container.querySelector('section[aria-labelledby="hero-title"] .grid-paper')!;
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel.textContent).toMatch(/illustration/i);
    expect(panel.querySelectorAll('.led-bar').length).toBeGreaterThanOrEqual(16);
    expect(panel.querySelector('path.trace-draw')).not.toBeNull();
    // The curve belongs to the first featured model that makes sound (Langit 6C, 70 Hz to 20 kHz).
    expect(panel.textContent).toContain('Langit 6C · −10 dB at 70 Hz and 20 kHz');
  });

  it('the venue finder lists every venue that has models and starts with no selection', async () => {
    const { container } = render(await HomePage());
    const finder = container.querySelector('section[aria-labelledby="venue-finder"]') as HTMLElement;
    expect(finder.querySelectorAll('input[type="radio"]')).toHaveLength(8);
    expect(finder.querySelector('input[type="radio"]:checked')).toBeNull();
  });

  it('the featured rail links each model, in curated order, to its datasheet', async () => {
    const { container } = render(await HomePage());
    const featured = container.querySelector('section[aria-labelledby="featured"]') as HTMLElement;
    const hrefs = Array.from(featured.querySelectorAll('ul.grid li a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(FEATURED_IDS.map((id) => `/models/${PRODUCTS.find((p) => p.id === id)!.slug}`));
  });

  it('explains the seven families as a signal chain', async () => {
    const { container } = render(await HomePage());
    const section = container.querySelector('section[aria-labelledby="families"]') as HTMLElement;
    for (const f of FAMILIES) {
      expect(section.textContent).toContain(f.series);
      expect(section.textContent).toContain(f.meaning);
    }
    expect(Array.from(section.querySelectorAll('ol[aria-label="The signal chain"] > li p.font-display')).map((p) => p.textContent)).toEqual([
      'Source', 'Processor', 'Amplifier', 'Speakers',
    ]);
  });

  it('"How buying works" has three steps and no time or quote promise', async () => {
    const { container } = render(await HomePage());
    const how = container.querySelector('section[aria-labelledby="how"]') as HTMLElement;
    expect(Array.from(how.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['Browse the datasheets', 'Send an inquiry', 'We follow up']);
    expect(how.textContent).not.toMatch(/within|hours|days|quote|soon|instant|₱|price/i);
  });

  it('never links to the checkout or cart', async () => {
    const { container } = render(await HomePage());
    for (const a of container.querySelectorAll('a[href]')) {
      expect(a.getAttribute('href')).not.toMatch(/checkout|cart/);
    }
  });

  it('uses squared corners only: no rounded or pill classes', async () => {
    const { container } = render(await HomePage());
    expect(container.innerHTML).not.toMatch(/rounded/);
  });
});
