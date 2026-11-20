import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { powerClass } from '@/lib/catalog/packs';
import { APPLICATIONS, CATEGORIES, FINISH_FAMILIES, MOUNTINGS, POWER_CLASSES } from '@/lib/catalog/types';
import { FACETS, facetDef, facetValueLabel } from '@/lib/shop/facets';

const values = (key: string) => facetDef(key)!.values.map((v) => v.value);

describe('facet vocabulary matches the catalogue types', () => {
  it('has one facet per key, in the expected order', () => {
    expect(FACETS.map((f) => f.key)).toEqual(['category', 'application', 'mounting', 'power', 'finish']);
  });

  it.each([
    ['category', CATEGORIES],
    ['application', APPLICATIONS],
    ['power', POWER_CLASSES],
  ] as const)('%s facet values equal the type tuple (same set, same order)', (key, tuple) => {
    expect(values(key)).toEqual([...tuple]);
  });

  it('mounting and finish facets only offer values the types define', () => {
    for (const v of values('mounting')) expect(MOUNTINGS as readonly string[]).toContain(v);
    for (const v of values('finish')) expect(FINISH_FAMILIES as readonly string[]).toContain(v);
    expect(new Set(values('mounting'))).toEqual(new Set(MOUNTINGS));
  });

  it('every product lands in a facet value that exists (no orphaned product)', () => {
    for (const p of PRODUCTS) {
      expect(values('category'), p.id).toContain(p.category);
      expect(values('mounting'), p.id).toContain(p.mounting);
      expect(values('finish'), p.id).toContain(p.finish.family);
      expect(values('power'), p.id).toContain(powerClass(p));
      for (const a of p.applications) expect(values('application'), p.id).toContain(a);
    }
  });

  it('gives every value a non-empty, unique label within its facet', () => {
    for (const facet of FACETS) {
      const labels = facet.values.map((v) => v.label);
      for (const label of labels) expect(label.length).toBeGreaterThan(0);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});

describe('facetDef / facetValueLabel', () => {
  it('returns labels for known values', () => {
    expect(facetValueLabel('category', 'column-array')).toBe('Column arrays');
    expect(facetValueLabel('application', 'worship')).toBe('Houses of worship');
    expect(facetValueLabel('power', 'high')).toBe('Over 600 W');
  });

  it('returns null for unknown facets and values, prototype keys included', () => {
    expect(facetDef('nope')).toBeNull();
    expect(facetValueLabel('category', 'gothic')).toBeNull();
    expect(facetValueLabel('nope', 'ceiling')).toBeNull();
    expect(facetValueLabel('category', '__proto__')).toBeNull();
    expect(facetDef('__proto__')).toBeNull();
  });
});
