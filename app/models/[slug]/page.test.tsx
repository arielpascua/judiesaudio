// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/navigation', () => nav);

import ModelPage, { dynamicParams, generateMetadata, generateStaticParams } from '@/app/models/[slug]/page';
import { PRODUCTS } from '@/lib/catalog/fixtures';

const run = (slug: string) => ModelPage({ params: Promise.resolve({ slug }) });
const MONEY = /₱|price|pricing|peso|maya|\bbuy\b|\bcart\b|payment|\bpay\b/i;

describe('/models/[slug] datasheet', () => {
  it('pre-renders every model and 404s anything else', async () => {
    expect((await generateStaticParams()).map((p) => p.slug)).toEqual(PRODUCTS.map((p) => p.slug));
    expect(dynamicParams).toBe(false);
    await expect(run('no-such-model')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(run('__proto__')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is a datasheet: name, schematic on a faceplate, spec table, response curve, applications, install notes', async () => {
    const { container } = render(await run('himig-8'));
    expect(screen.getByRole('heading', { level: 1, name: 'Himig 8' })).toBeInTheDocument();
    expect(container.querySelector('.faceplate svg[role="img"]')).toHaveAttribute('aria-label', expect.stringContaining('Himig 8'));
    const table = screen.getByRole('table', { name: 'Specifications of Himig 8' });
    expect(within(table).getByText('55 Hz – 20 kHz')).toBeInTheDocument();
    expect(within(table).getByText('Constant voltage (70/100 V)')).toBeInTheDocument();
    expect(container.querySelector('path.trace-draw')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Install notes' })).toBeInTheDocument();
    expect(screen.getByText('Mount to a structure rated for at least four times the unit weight.')).toBeInTheDocument();
  });

  it('links the application chips to their venue pages', async () => {
    render(await run('himig-8'));
    expect(screen.getByRole('link', { name: 'Restaurants & bars' })).toHaveAttribute('href', '/shop/application/restaurant-bar');
    expect(screen.getByRole('link', { name: 'Gyms & studios' })).toHaveAttribute('href', '/shop/application/fitness');
  });

  it('asks about the model via /inquiry?product=<slug>, with no buy button and no promise', async () => {
    const { container } = render(await run('himig-8'));
    const ctas = screen.getAllByRole('link', { name: 'Ask about this model' });
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    for (const a of ctas) expect(a).toHaveAttribute('href', '/inquiry?product=himig-8');
    expect(container.textContent).not.toMatch(MONEY);
    expect(container.textContent).not.toMatch(/within|hours|business days|quote|reply|respond|in stock/i);
  });

  it('shows the honest empty state instead of a curve for an amplifier', async () => {
    const { container } = render(await run('lakas-d4-600'));
    expect(screen.getByRole('note')).toHaveTextContent('Not applicable: this product does not produce sound.');
    expect(container.querySelector('path.trace-draw')).toBeNull();
    expect(screen.getByRole('table', { name: 'Specifications of Lakas D4-600' })).toBeInTheDocument();
  });

  it('offers the other models in the same family, and none for a family of one', async () => {
    render(await run('himig-8'));
    const more = screen.getByRole('heading', { name: 'More in Himig' }).closest('section')!;
    expect(Array.from(more.querySelectorAll('li a')).map((a) => a.getAttribute('href'))).toEqual([
      '/models/himig-6', '/models/himig-12', '/models/himig-15a',
    ]);
  });

  it('lists the packs as a label and a unit count, with no amount', async () => {
    render(await run('langit-6c'));
    const list = screen.getByRole('heading', { name: 'Supplied as' }).nextElementSibling as HTMLElement;
    expect(Array.from(list.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Single unit', 'Carton of 10 · 10']);
  });

  it('embeds Product JSON-LD with no offers and no price', async () => {
    const { container } = render(await run('himig-8'));
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent!);
    expect(ld['@type']).toBe('Product');
    expect(ld).not.toHaveProperty('offers');
    expect(script.textContent).not.toMatch(/offer|price|₱/i);
  });

  it('every model renders without a price, a rug or Taruuv, and says the drawing is a schematic', async () => {
    for (const p of PRODUCTS) {
      const { container, unmount } = render(await run(p.slug));
      expect(container.textContent, p.slug).not.toMatch(MONEY);
      expect(container.textContent, p.slug).not.toMatch(/taruuv|\brugs?\b/i);
      expect(container.textContent, p.slug).toMatch(/schematics generated from each specification/);
      unmount();
    }
  });

  it('has canonical metadata, an indexable page, and a metadata description free of price words', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'himig-8' }) });
    expect(meta.title).toBe('Himig 8 datasheet');
    expect(meta.alternates?.canonical).toBe('/models/himig-8');
    expect(meta.robots).toBeUndefined();
    expect(String(meta.description)).not.toMatch(MONEY);
    const missing = await generateMetadata({ params: Promise.resolve({ slug: 'nope' }) });
    expect(missing.robots).toEqual({ index: false });
  });
});
