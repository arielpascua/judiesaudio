import { describe, expect, it } from 'vitest';
import { powerClass } from '@/lib/catalog/packs';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts, type PublicProduct } from '@/lib/catalog/public';
import {
  applyFilters,
  buildQuery,
  countActiveFilters,
  parseFilters,
  sortProducts,
} from '@/lib/shop/filters';

const ALL = toPublicProducts(PRODUCTS);

describe('parseFilters: hostile and garbage input', () => {
  it('returns defaults for an empty query', () => {
    expect(parseFilters({})).toEqual({ sort: 'featured' });
  });

  it('keeps valid values and silently drops invalid ones', () => {
    expect(
      parseFilters({ category: 'zzz', application: 'worship', minPrice: 'abc', sort: '<script>' }),
    ).toEqual({ application: 'worship', sort: 'featured' });
  });

  it('takes the first of a repeated key', () => {
    expect(parseFilters({ category: ['subwoofer', 'ceiling'] }).category).toBe('subwoofer');
  });

  it('accepts all five facets', () => {
    expect(
      parseFilters({ category: 'ceiling', application: 'retail', mounting: 'ceiling', power: 'compact', finish: 'white' }),
    ).toEqual({ category: 'ceiling', application: 'retail', mounting: 'ceiling', power: 'compact', finish: 'white', sort: 'featured' });
  });

  it('does not let a prototype key through as a facet value', () => {
    expect(parseFilters({ category: '__proto__', finish: 'constructor' })).toEqual({ sort: 'featured' });
  });

  it('ignores stale price params and price sorts from old shared links (never an error)', () => {
    const f = parseFilters({ minPrice: '100', maxPrice: '900', sort: 'price-asc' });
    expect(f).toEqual({ sort: 'featured' });
    expect(f).not.toHaveProperty('minPrice');
    expect(f).not.toHaveProperty('maxPrice');
    expect(parseFilters({ sort: 'price-desc' }).sort).toBe('featured');
  });

  it('accepts only the featured and name sorts', () => {
    expect(parseFilters({ sort: 'name' }).sort).toBe('name');
    expect(parseFilters({ sort: 'featured' }).sort).toBe('featured');
  });

  it('trims and caps the search text', () => {
    expect(parseFilters({ q: '  horn  ' }).q).toBe('horn');
    expect(parseFilters({ q: 'x'.repeat(500) }).q).toHaveLength(80);
    expect(parseFilters({ q: '   ' }).q).toBeUndefined();
  });

  it('never leaves a trailing space when the cap cuts mid-whitespace', () => {
    const q = 'a'.repeat(79) + ' ' + 'b'.repeat(20);
    const f = parseFilters({ q });
    expect(f.q).toBe('a'.repeat(79));
    expect(parseFilters(Object.fromEntries(new URLSearchParams(buildQuery(f))))).toEqual(f);
  });
});

const haystack = (p: PublicProduct) =>
  [p.name, p.series, p.category, p.mounting, p.finish.name, p.shortDescription, p.specs.drivers].join(' ').toLowerCase();

describe('applyFilters / sortProducts', () => {
  it('filters by category', () => {
    const subs = applyFilters(ALL, parseFilters({ category: 'subwoofer' }));
    expect(subs.map((p) => p.id)).toEqual(['ja-sw-01', 'ja-sw-02']);
  });

  it('filters by application (a product matches when it is listed for that venue)', () => {
    const worship = applyFilters(ALL, parseFilters({ application: 'worship' }));
    expect(worship.length).toBeGreaterThan(0);
    for (const p of worship) expect(p.applications).toContain('worship');
    expect(worship.length).toBe(ALL.filter((p) => p.applications.includes('worship')).length);
  });

  it('filters by mounting and by finish family', () => {
    for (const p of applyFilters(ALL, parseFilters({ mounting: 'rack' }))) expect(p.mounting).toBe('rack');
    const grey = applyFilters(ALL, parseFilters({ finish: 'grey' }));
    expect(grey.length).toBe(3);
    for (const p of grey) expect(p.finish.family).toBe('grey');
  });

  it('filters by power class using the same bands as the Power facet', () => {
    for (const power of ['compact', 'mid', 'high'] as const) {
      const hits = applyFilters(ALL, parseFilters({ power }));
      expect(hits.length, power).toBeGreaterThan(0);
      for (const p of hits) expect(powerClass(p)).toBe(power);
    }
    // The three bands partition the catalogue.
    const total = (['compact', 'mid', 'high'] as const).reduce((n, power) => n + applyFilters(ALL, parseFilters({ power })).length, 0);
    expect(total).toBe(ALL.length);
  });

  it('combines facets with AND', () => {
    const both = applyFilters(ALL, parseFilters({ category: 'ceiling', application: 'education' }));
    expect(both.map((p) => p.id)).toEqual(['ja-ce-02']);
  });

  it('searches name, series, finish and drivers, case-insensitively', () => {
    const hits = applyFilters(ALL, parseFilters({ q: 'HIMIG' }));
    // The four Himig cabinets, plus the system whose driver list names Himig 8.
    expect(hits.map((p) => p.id)).toEqual(['ja-fr-01', 'ja-fr-02', 'ja-fr-03', 'ja-fr-04', 'ja-sy-03']);
    for (const p of applyFilters(ALL, parseFilters({ q: 'compression' }))) expect(haystack(p)).toContain('compression');
  });

  it('requires every whitespace-separated token to match, across fields', () => {
    expect(applyFilters(ALL, parseFilters({ q: 'ceiling black' })).map((p) => p.id)).toEqual(['ja-ce-03']);
    expect(applyFilters(ALL, parseFilters({ q: 'himig nonsensetoken' }))).toEqual([]);
  });

  it('returns an empty array, never throws, when nothing matches', () => {
    expect(applyFilters(ALL, parseFilters({ q: 'no-such-model-anywhere' }))).toEqual([]);
  });

  it('sorts by name, and keeps the catalogue order for featured', () => {
    const names = sortProducts(ALL, 'name').map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(sortProducts(ALL, 'featured').map((p) => p.id)).toEqual(ALL.map((p) => p.id));
  });

  it('does not mutate the list it is given', () => {
    const before = ALL.map((p) => p.id);
    sortProducts(ALL, 'name');
    expect(ALL.map((p) => p.id)).toEqual(before);
  });
});

describe('price helpers are gone (R-B2B-2)', () => {
  it('the filters module exports no price function or price sort', async () => {
    const mod = (await import('@/lib/shop/filters')) as Record<string, unknown>;
    expect(mod.fromPrice).toBeUndefined();
    expect(mod.priceForPack).toBeUndefined();
    expect(parseFilters({ sort: 'price-asc' }).sort).toBe('featured');
  });
});

describe('countActiveFilters', () => {
  it('counts facet values and search text, but not sort', () => {
    expect(countActiveFilters(parseFilters({}))).toBe(0);
    expect(countActiveFilters(parseFilters({ sort: 'price-asc' }))).toBe(0);
    expect(countActiveFilters(parseFilters({ category: 'ceiling', mounting: 'ceiling' }))).toBe(2);
    expect(countActiveFilters(parseFilters({ q: 'horn', minPrice: '1000', maxPrice: '9000', power: 'high' }))).toBe(2);
  });
});

describe('buildQuery', () => {
  it('round-trips through parseFilters and omits defaults', () => {
    const f = parseFilters({ category: 'ceiling', finish: 'white', sort: 'name', q: 'horn' });
    const qs = buildQuery(f);
    expect(qs).not.toContain('featured');
    const parsed = parseFilters(Object.fromEntries(new URLSearchParams(qs)));
    expect(parsed).toEqual(f);
    expect(buildQuery({ sort: 'featured' })).toBe('');
  });
});
