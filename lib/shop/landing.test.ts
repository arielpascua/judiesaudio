import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts } from '@/lib/catalog/public';
import { FACETS } from '@/lib/shop/facets';
import { applyFilters } from '@/lib/shop/filters';
import { availableFacets, landingFilters, landingParams } from '@/lib/shop/landing';

const ALL = toPublicProducts(PRODUCTS);

describe('landing pages', () => {
  const params = landingParams(ALL);

  it('only generates combinations that contain at least one model', () => {
    expect(params.length).toBeGreaterThan(20);
    for (const { facet, value } of params) {
      const filters = landingFilters(facet, value)!;
      expect(filters, `${facet}/${value}`).not.toBeNull();
      expect(applyFilters(ALL, filters).length, `${facet}/${value}`).toBeGreaterThan(0);
    }
  });

  it('includes the real categories and venues', () => {
    expect(params).toContainEqual({ facet: 'category', value: 'ceiling' });
    expect(params).toContainEqual({ facet: 'application', value: 'worship' });
    expect(params).toContainEqual({ facet: 'power', value: 'high' });
  });

  it('has no duplicate paths', () => {
    expect(new Set(params.map((p) => `${p.facet}/${p.value}`)).size).toBe(params.length);
  });

  it('drops a value when the catalogue has no model for it', () => {
    const noSubs = ALL.filter((p) => p.category !== 'subwoofer');
    expect(landingParams(noSubs)).not.toContainEqual({ facet: 'category', value: 'subwoofer' });
  });

  it('rejects unknown facets and values, including prototype keys', () => {
    expect(landingFilters('category', 'zzz')).toBeNull();
    expect(landingFilters('flavour', 'ceiling')).toBeNull();
    expect(landingFilters('category', '__proto__')).toBeNull();
    expect(landingFilters('constructor', 'ceiling')).toBeNull();
    expect(landingFilters('category', 'ceiling')).toEqual({ sort: 'featured', category: 'ceiling' });
  });
});

describe('availableFacets', () => {
  it('keeps every facet and value the catalogue can fill, so no menu link can 404', () => {
    const live = new Set(landingParams(ALL).map((p) => `${p.facet}/${p.value}`));
    for (const facet of availableFacets(ALL)) {
      for (const v of facet.values) expect(live.has(`${facet.key}/${v.value}`), `${facet.key}/${v.value}`).toBe(true);
    }
    expect(availableFacets(ALL).map((f) => f.key)).toEqual(FACETS.map((f) => f.key));
  });

  it('omits a value with no models and a facet with no values at all', () => {
    const onlyCeiling = ALL.filter((p) => p.category === 'ceiling');
    const facets = availableFacets(onlyCeiling);
    expect(facets.find((f) => f.key === 'category')!.values.map((v) => v.value)).toEqual(['ceiling']);
    expect(availableFacets([])).toEqual([]);
  });
});
