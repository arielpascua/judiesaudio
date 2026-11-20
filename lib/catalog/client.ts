import 'server-only';

// The ONLY read path for the catalogue on the server. The catalogue is code
// (lib/catalog/fixtures.ts): there is no catalogue database, so there is no
// stale copy, no second price authority and nothing to seed.

import { PRODUCTS } from './fixtures';
import { toPublicProduct, type PublicProduct } from './public';
import type { Product } from './types';

export async function fetchProducts(): Promise<Product[]> {
  return [...PRODUCTS];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

/** Price-free views for public pages (R-B2B-2): the type has no price to leak. */
export async function fetchPublicProducts(): Promise<PublicProduct[]> {
  return PRODUCTS.map(toPublicProduct);
}

export async function fetchPublicProductBySlug(slug: string): Promise<PublicProduct | null> {
  const product = PRODUCTS.find((p) => p.slug === slug);
  return product ? toPublicProduct(product) : null;
}

/** What checkout charges from. */
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const wanted = new Set(ids);
  return PRODUCTS.filter((p) => wanted.has(p.id));
}
