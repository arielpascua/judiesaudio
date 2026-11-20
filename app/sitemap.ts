import type { MetadataRoute } from 'next';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { LEGAL_SLUGS } from '@/lib/legal';
import { landingParams } from '@/lib/shop/landing';
import { siteBase } from '@/lib/site';

// Lists the public pages only. Never /checkout, /search, /product or /api.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchPublicProducts();
  const paths = [
    '/',
    '/shop',
    ...landingParams(products).map((p) => `/shop/${p.facet}/${p.value}`),
    ...products.map((p) => `/models/${p.slug}`),
    '/about',
    '/help',
    '/inquiry',
    ...LEGAL_SLUGS.map((slug) => `/legal/${slug}`),
  ];
  const base = siteBase();
  return paths.map((p) => ({ url: `${base}${p === '/' ? '' : p}` }));
}
