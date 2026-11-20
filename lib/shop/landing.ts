import type { PublicProduct } from '@/lib/catalog/public';
import { FACETS, facetValueLabel, type FacetDef } from './facets';
import { applyFilters, parseFilters, type ShopFilters } from './filters';

/** Validated filters for a landing page, or null for an unknown facet/value. */
export function landingFilters(facet: string, value: string): ShopFilters | null {
  if (facetValueLabel(facet, value) === null) return null;
  const filters = parseFilters({ [facet]: value });
  return (filters as unknown as Record<string, unknown>)[facet] === value ? filters : null;
}

/** Every valid facet/value pair that has at least one product: the static paths. */
export function landingParams(products: readonly PublicProduct[]): { facet: string; value: string }[] {
  const out: { facet: string; value: string }[] = [];
  for (const facet of FACETS) {
    for (const v of facet.values) {
      const filters = landingFilters(facet.key, v.value);
      if (filters && applyFilters(products, filters).length > 0) out.push({ facet: facet.key, value: v.value });
    }
  }
  return out;
}

/**
 * The facets with only the values that have at least one product, so the menus never link to a page that would 404.
 * Plain data: safe to hand to a client component.
 */
export function availableFacets(products: readonly PublicProduct[]): FacetDef[] {
  const live = new Set(landingParams(products).map((p) => `${p.facet}/${p.value}`));
  return FACETS.map((facet) => ({
    ...facet,
    values: facet.values.filter((v) => live.has(`${facet.key}/${v.value}`)),
  })).filter((facet) => facet.values.length > 0);
}
