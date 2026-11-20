// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SearchPage from '@/app/search/page';
import LandingPage, { generateMetadata } from '@/app/shop/[facet]/[value]/page';
import ShopPage, { metadata as shopMetadata } from '@/app/shop/page';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts } from '@/lib/catalog/public';
import { landingParams } from '@/lib/shop/landing';

const PUBLIC_PRODUCTS = toPublicProducts(PRODUCTS);

// No Supabase variables are set in tests, and the catalogue is code, so the pages read the fixtures.

async function renderShop(searchParams: Record<string, string> = {}) {
  return render(await ShopPage({ searchParams: Promise.resolve(searchParams) }));
}

describe('/shop landmarks and live regions', () => {
  it('has an sr-only "Models" h2 before the grid so the card h3s have a parent heading', async () => {
    const { container } = await renderShop();
    const h2 = within(container).getByRole('heading', { level: 2, name: 'Models' });
    expect(h2.className).toContain('sr-only');
    const list = container.querySelector('ul.grid')!;
    expect(h2.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts role=status on the result count only, and aria-live on nothing', async () => {
    const { container } = await renderShop();
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(0);
    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent(`${PRODUCTS.length} models`);
    // the grid is not inside the live region
    expect(statuses[0].querySelector('ul')).toBeNull();
  });

  it('wraps the filter panel in a plain div, not an <aside> landmark', async () => {
    const { container } = await renderShop();
    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('details')).not.toBeNull();
  });

  it('shows the empty state with the default copy when nothing matches', async () => {
    await renderShop({ q: 'no-such-model-anywhere' });
    expect(screen.getByText('No models match those filters')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('status')).toHaveTextContent('0 models');
  });

  it('offers the five facet selects: product type, venue, mounting, power and finish', async () => {
    await renderShop();
    for (const label of ['Product type', 'Venue', 'Mounting', 'Power', 'Finish']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });
});

const NO_PRICE = /₱|price|pricing|peso|Maya|\bbuy\b|\bcart\b/i;

function modelLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll('ul.grid li a')).map((a) => a.getAttribute('href'));
}

describe('public catalogue shows no prices and links each card to its datasheet (R-B2B-1, R-B2B-2)', () => {
  it('/shop has no price word or amount and every card links to /models/<slug>', async () => {
    const { container } = await renderShop();
    expect(container.textContent).not.toMatch(NO_PRICE);
    expect(container.querySelector('input[type="number"]')).toBeNull();
    const links = modelLinks(container);
    expect(links).toHaveLength(PRODUCTS.length);
    for (const product of PRODUCTS) expect(links).toContain(`/models/${product.slug}`);
  });

  it('/shop?category=subwoofer filters by the type and shows no price', async () => {
    const { container } = await renderShop({ category: 'subwoofer' });
    expect(container.textContent).not.toMatch(NO_PRICE);
    expect(modelLinks(container)).toEqual(['/models/dagundong-12s', '/models/dagundong-18s']);
    expect(screen.getByRole('link', { name: 'Remove filter Subwoofers' })).toHaveAttribute('href', '/shop');
  });

  it('the venue-finder links (application + category) narrow to the intersection', async () => {
    const { container } = await renderShop({ application: 'worship', category: 'column-array' });
    expect(modelLinks(container)).toEqual(['/models/haligi-c8', '/models/haligi-c16']);
  });

  it('old shared links still render: stale price params and price sorts are ignored', async () => {
    const plain = await renderShop();
    const plainHtml = plain.container.innerHTML;
    plain.unmount();
    const { container } = await renderShop({ minPrice: '1000', maxPrice: '5000', sort: 'price-asc' });
    expect(container.textContent).not.toMatch(NO_PRICE);
    expect(container.innerHTML).toBe(plainHtml);
    expect(container.querySelector('ul[aria-label="Active filters"]')).toBeNull();
    expect(screen.getByLabelText('Sort by')).toHaveValue('featured');
  });

  it('/shop?sort=name sorts by name', async () => {
    const { container } = await renderShop({ sort: 'name' });
    const names = Array.from(container.querySelectorAll('ul.grid li h3')).map((h) => h.textContent!);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('/shop/category/ceiling (landing) has no price and links to datasheets', async () => {
    const { container } = render(await LandingPage({ params: Promise.resolve({ facet: 'category', value: 'ceiling' }) }));
    expect(container.textContent).not.toMatch(NO_PRICE);
    expect(modelLinks(container)).toEqual(['/models/langit-6c', '/models/langit-8c', '/models/langit-4s-pendant']);
    expect(within(container).getByRole('heading', { level: 2, name: 'Models' }).className).toContain('sr-only');
    expect(screen.getByRole('heading', { level: 1, name: 'Ceiling speakers' })).toBeInTheDocument();
  });

  it('/shop/application/worship (landing) lists models listed for that venue', async () => {
    const { container } = render(await LandingPage({ params: Promise.resolve({ facet: 'application', value: 'worship' }) }));
    expect(container.textContent).not.toMatch(NO_PRICE);
    expect(modelLinks(container)).toHaveLength(PRODUCTS.filter((p) => p.applications.includes('worship')).length);
  });

  it('landing pages keep unique titles and descriptions with no price wording', async () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const { facet, value } of landingParams(PUBLIC_PRODUCTS)) {
      const meta = await generateMetadata({ params: Promise.resolve({ facet, value }) });
      const title = String(meta.title);
      const description = String(meta.description);
      expect(`${title} ${description}`, `${facet}/${value}`).not.toMatch(NO_PRICE);
      expect(description, `${facet}/${value}`).not.toMatch(/\brugs?\b|taruuv/i);
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      expect(descriptions.has(description), `duplicate description ${description}`).toBe(false);
      titles.add(title);
      descriptions.add(description);
    }
    expect(titles.size).toBeGreaterThan(20);
  });

  it('/shop metadata has no price wording', () => {
    expect(`${String(shopMetadata.title)} ${String(shopMetadata.description)}`).not.toMatch(NO_PRICE);
  });
});

describe('/search', () => {
  it('names the search landmark, wraps long queries, and shows the grid under a Models heading', async () => {
    const { container } = render(await SearchPage({ searchParams: Promise.resolve({ q: 'himig' }) }));
    expect(screen.getByRole('search', { name: 'Search models' })).toBeInTheDocument();
    expect(container.querySelector('h1')!.className).toContain('break-words');
    expect(within(container).getByRole('heading', { level: 2, name: 'Models' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/\d+ models?/);
  });

  it('shows no price and links every result to its datasheet; stale price sorts are ignored', async () => {
    const { container } = render(
      await SearchPage({ searchParams: Promise.resolve({ q: 'himig', sort: 'price-desc' }) }),
    );
    expect(container.textContent).not.toMatch(NO_PRICE);
    const links = modelLinks(container);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(href).toMatch(/^\/models\//);
  });

  it('prompts for a search when there is no query', async () => {
    const { container } = render(await SearchPage({ searchParams: Promise.resolve({}) }));
    expect(container.querySelector('ul.grid')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Search models' })).toBeInTheDocument();
  });

  it('uses search-specific empty-state copy', async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: 'no-such-model-anywhere' }) }));
    expect(screen.getByText('No models match that search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/shop');
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });
});
