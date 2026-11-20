// CLIENT-SAFE. No server-only imports, no process.env. The checkout UI receives
// this compact index from a server component so that every price it displays
// comes from the server catalogue, never from localStorage.

import type { ArtKind, Category, PackId, Product } from './types';

export interface IndexedProduct {
  id: string;
  slug: string;
  name: string;
  series: string;
  category: Category;
  art: ArtKind;
  inStock: boolean;
  finishName: string;
  /** Finish colour, a hex string: lets the checkout draw the schematic thumbnail. */
  finishHex: string;
  /** Driver count and main driver size in inches: inputs to the schematic only. */
  woofers: number;
  wooferIn: number;
  packs: { id: PackId; label: string; units: number; price: number }[];
}

export type CatalogueIndex = Record<string, IndexedProduct>;

export function buildCatalogueIndex(products: readonly Product[]): CatalogueIndex {
  // Null prototype: a hostile id such as "constructor" or "__proto__" must not
  // resolve to an inherited value.
  const index: CatalogueIndex = Object.create(null);
  for (const product of products) {
    index[product.id] = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      series: product.series,
      category: product.category,
      art: product.art,
      inStock: product.inStock,
      finishName: product.finish.name,
      finishHex: product.finish.hex,
      woofers: product.specs.woofers,
      wooferIn: product.specs.wooferIn,
      packs: product.packs.map((p) => ({ id: p.id, label: p.label, units: p.units, price: p.price })),
    };
  }
  return index;
}

/**
 * React Server Components cannot pass a null-prototype object to a client
 * component, so the server hands the index over as a plain object...
 */
export function toPlainIndex(index: CatalogueIndex): CatalogueIndex {
  return Object.fromEntries(Object.entries(index));
}

/**
 * ...and the client restores the null-prototype lookup, so a hostile id such as
 * "constructor" or "__proto__" still resolves to nothing. Assigning onto a
 * null-prototype object creates an own property even for the key "__proto__".
 */
export function toLookupIndex(plain: CatalogueIndex): CatalogueIndex {
  const index: CatalogueIndex = Object.create(null);
  for (const [id, product] of Object.entries(plain)) index[id] = product;
  return index;
}
