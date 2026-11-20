import type { Pack, Product } from './types';

// The ONLY door between the priced catalogue and the public pages (R-B2B-2).
// Public components must be typed against PublicProduct so a price cannot reach
// them by accident; the checkout and its API keep using Product.
export type PublicPack = Omit<Pack, 'price'>;
export type PublicProduct = Omit<Product, 'packs'> & { packs: PublicPack[] };

// Every field is listed on purpose: a field added to Product later must be
// opted in here, never leak by spreading.
export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    series: product.series,
    category: product.category,
    applications: [...product.applications],
    mounting: product.mounting,
    finish: { name: product.finish.name, family: product.finish.family, hex: product.finish.hex },
    art: product.art,
    specs: { ...product.specs, dimensionsMm: [...product.specs.dimensionsMm] },
    packs: product.packs.map(({ id, label, units }) => ({ id, label, units })),
    inStock: product.inStock,
    shortDescription: product.shortDescription,
    description: [...product.description],
    install: [...product.install],
  };
}

export const toPublicProducts = (products: readonly Product[]): PublicProduct[] => products.map(toPublicProduct);

/**
 * The inquiry form shows a name, finish, drawing and the packs and nothing else.
 * It is a client component, so everything handed to it is page payload: this
 * projection keeps descriptions and applications out of the browser.
 */
export type InquiryProduct = Pick<PublicProduct, 'id' | 'slug' | 'name' | 'series' | 'category' | 'art'> & {
  finish: Pick<PublicProduct['finish'], 'name' | 'hex'>;
  packs: PublicPack[];
};

export function toInquiryProduct(product: PublicProduct): InquiryProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    series: product.series,
    category: product.category,
    art: product.art,
    finish: { name: product.finish.name, hex: product.finish.hex },
    packs: product.packs.map(({ id, label, units }) => ({ id, label, units })),
  };
}

export const toInquiryProducts = (products: readonly PublicProduct[]): InquiryProduct[] => products.map(toInquiryProduct);
