// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InquiryForm } from '@/components/inquiry/InquiryForm';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts } from '@/lib/catalog/public';

const fetchPublicProducts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/catalog/client', () => ({ fetchPublicProducts }));

import InquiryPage, { metadata } from '@/app/inquiry/page';

const publicProducts = toPublicProducts(PRODUCTS);

beforeEach(() => {
  fetchPublicProducts.mockReset().mockResolvedValue(publicProducts);
});

type Query = { product?: string | string[]; venue?: string | string[]; area?: string | string[] };
const page = (query: Query = {}) => InquiryPage({ searchParams: Promise.resolve(query) });

type FormProps = { products: unknown[]; initialSlug?: string; initialNote?: string };

function findForm(node: ReactNode): ReactElement<FormProps> | null {
  if (!isValidElement(node)) return null;
  if (node.type === InquiryForm) return node as ReactElement<FormProps>;
  const children = (node.props as { children?: ReactNode }).children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findForm(child);
    if (found) return found;
  }
  return null;
}

describe('/inquiry page', () => {
  it('passes the first ?product= value as initialSlug', async () => {
    expect(findForm(await page({ product: publicProducts[0].slug }))?.props.initialSlug).toBe(publicProducts[0].slug);
    expect(findForm(await page({ product: [publicProducts[1].slug, 'other'] }))?.props.initialSlug).toBe(publicProducts[1].slug);
  });

  it('tolerates a missing, empty or garbage product value', async () => {
    for (const value of [undefined, '', [], ['__proto__'], 'x'.repeat(5000)] as const) {
      const query = { product: value as string | string[] | undefined };
      expect(findForm(await page(query))).not.toBeNull();
      render(await page(query)).unmount();
    }
    expect(findForm(await page({ product: 'x'.repeat(5000) }))?.props.initialSlug).toBeUndefined();
  });

  it('turns the venue finder values into a note, and drops anything that is not whitelisted', async () => {
    expect(findForm(await page({ venue: 'worship', area: '150-400' }))?.props.initialNote).toBe(
      'Venue: Houses of worship. Floor area: 150 – 400 m².',
    );
    expect(findForm(await page({ venue: '<script>alert(1)</script>', area: 'lots' }))?.props.initialNote).toBe('');
    expect(findForm(await page())?.props.initialNote).toBe('');
  });

  it('renders the heading and intro', async () => {
    render(await page());
    expect(screen.getByRole('heading', { level: 1, name: 'Send an inquiry' })).toBeInTheDocument();
    expect(screen.getByText(/does not place an order/)).toBeInTheDocument();
  });

  it('hands the form a minimal price-free projection: no description, applications or price', async () => {
    fetchPublicProducts.mockResolvedValue(
      publicProducts.map((p) => ({ ...p, description: ['a lower price per unit'], shortDescription: 'lower price per unit' })),
    );
    const form = findForm(await page());
    expect(form?.props.products).toHaveLength(publicProducts.length);
    const serialised = JSON.stringify(form?.props);
    for (const key of ['description', 'shortDescription', 'applications', 'specs', 'price']) {
      expect(serialised).not.toContain(`"${key}"`);
    }
    expect(serialised).not.toMatch(/price per unit|₱/i);
    for (const product of form?.props.products as Record<string, unknown>[]) {
      expect(Object.keys(product).sort()).toEqual(['art', 'category', 'finish', 'id', 'name', 'packs', 'series', 'slug']);
    }
  });

  it('has a canonical /inquiry, a title and a description with no price or promise wording', () => {
    expect(metadata.alternates?.canonical).toBe('/inquiry');
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
    expect(`${String(metadata.title)} ${metadata.description}`).not.toMatch(/price|pricing|peso|₱|maya|quote|reply|respond/i);
  });

  it('puts no price, peso sign or Maya in the rendered page', async () => {
    const { container } = render(await page({ product: publicProducts[0].slug }));
    expect(container.innerHTML).not.toMatch(/₱|price|peso|maya/i);
  });
});
