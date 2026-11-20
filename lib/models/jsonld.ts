import type { PublicProduct } from '@/lib/catalog/public';
import { facetValueLabel } from '@/lib/shop/facets';
import { specRows } from '@/lib/shop/spec-format';
import { siteBase } from '@/lib/site';

/**
 * schema.org Product for a model page. DELIBERATELY has no offer, price or
 * availability (R-B2B-1), and no image (the drawing is a schematic, not a photograph).
 */
export function productJsonLd(product: PublicProduct, base: string = siteBase()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id,
    url: `${base}/models/${product.slug}`,
    description: product.shortDescription,
    category: facetValueLabel('category', product.category) ?? product.category,
    color: product.finish.name,
    weight: { '@type': 'QuantitativeValue', value: product.specs.weightKg, unitCode: 'KGM' },
    additionalProperty: specRows(product)
      .filter((r) => r.label !== 'Finish' && r.value !== 'Not applicable')
      .map((r) => ({ '@type': 'PropertyValue', name: r.label, value: r.value })),
  };
}

/** JSON for an inline <script type="application/ld+json">: "<" is escaped so a value can never close the tag. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
