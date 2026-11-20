import { describe, expect, it } from 'vitest';
import { FEATURED_IDS } from '@/lib/catalog/featured';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProducts, type PublicProduct } from '@/lib/catalog/public';
import { APPLICATIONS, CATEGORIES } from '@/lib/catalog/types';
import {
  AREA_BANDS, FAMILIES, SIGNAL_CHAIN, areaLabel, featuredProducts, inquiryHref, venueNote, venueResult,
} from '@/lib/home';

const PUBLIC = toPublicProducts(PRODUCTS);

describe('featuredProducts', () => {
  it('returns the curated ids in the authored order, spanning several categories', () => {
    const featured = featuredProducts(PUBLIC);
    expect(featured.map((p) => p.id)).toEqual([...FEATURED_IDS]);
    expect(new Set(featured.map((p) => p.category)).size).toBeGreaterThanOrEqual(5);
  });

  it('skips an id that is not in the catalogue instead of throwing', () => {
    const without = PUBLIC.filter((p) => p.id !== FEATURED_IDS[0]);
    expect(featuredProducts(without).map((p) => p.id)).toEqual(FEATURED_IDS.slice(1));
  });

  it('carries no price (typed PublicProduct)', () => {
    for (const product of featuredProducts(PUBLIC)) for (const pack of product.packs) expect(pack).not.toHaveProperty('price');
  });
});

describe('model families', () => {
  it('names exactly the seven families, with their Filipino meanings', () => {
    expect(FAMILIES.map((f) => [f.series, f.meaning])).toEqual([
      ['Himig', 'melody'],
      ['Dagundong', 'rumble'],
      ['Haligi', 'pillar'],
      ['Langit', 'sky'],
      ['Ulan', 'rain'],
      ['Lakas', 'strength'],
      ['Tipon', 'to gather'],
    ]);
  });

  it('every family is a real series, and its category is the category of its models', () => {
    for (const family of FAMILIES) {
      const ofSeries = PRODUCTS.filter((p) => p.series === family.series);
      expect(ofSeries.length, family.series).toBeGreaterThan(0);
      for (const product of ofSeries) expect(product.category, product.name).toBe(family.category);
    }
  });

  it('covers every series in the catalogue (none is left unexplained)', () => {
    expect(new Set(FAMILIES.map((f) => f.series))).toEqual(new Set(PRODUCTS.map((p) => p.series)));
  });

  it('lays the signal chain out as source, processor, amplifier, speakers', () => {
    expect(SIGNAL_CHAIN.map((l) => l.stage)).toEqual(['source', 'processor', 'amplifier', 'speaker']);
    expect(SIGNAL_CHAIN[0].note).toMatch(/not sold here/i);
  });
});

describe('venue finder (pure navigation)', () => {
  it('lists, per venue, only categories that have models listed for that venue, with true counts', () => {
    for (const venue of APPLICATIONS) {
      const result = venueResult(PUBLIC, venue);
      const forVenue = PUBLIC.filter((p) => p.applications.includes(venue));
      expect(result.total).toBe(forVenue.length);
      expect(result.categories.reduce((n, c) => n + c.count, 0)).toBe(forVenue.length);
      for (const c of result.categories) {
        expect(CATEGORIES).toContain(c.category);
        expect(c.count).toBe(forVenue.filter((p) => p.category === c.category).length);
        expect(c.href).toBe(`/shop?application=${venue}&category=${c.category}`);
      }
    }
  });

  it('links to the venue landing page, which exists, and to the inquiry carrying the venue', () => {
    const result = venueResult(PUBLIC, 'worship', '150-400');
    expect(result.shopHref).toBe('/shop/application/worship');
    expect(result.inquiryHref).toBe('/inquiry?venue=worship&area=150-400');
    expect(venueResult(PUBLIC, 'worship').inquiryHref).toBe('/inquiry?venue=worship');
  });

  it('gives a venue with no models an empty result rather than inventing matches', () => {
    const none: PublicProduct[] = [];
    const result = venueResult(none, 'retail');
    expect(result.total).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('offers four floor-area bands, each labelled, and rejects anything else', () => {
    expect(AREA_BANDS.map((b) => b.value)).toEqual(['under-50', '50-150', '150-400', 'over-400']);
    expect(areaLabel('50-150')).toBe('50 – 150 m²');
    expect(areaLabel('<script>')).toBeNull();
    expect(areaLabel('__proto__')).toBeNull();
  });

  it('inquiryHref encodes its values', () => {
    expect(inquiryHref('a b', 'c&d')).toBe('/inquiry?venue=a+b&area=c%26d');
  });

  it('venueNote turns whitelisted values into a note and drops everything else', () => {
    expect(venueNote('restaurant-bar', 'under-50')).toBe('Venue: Restaurants & bars. Floor area: Under 50 m².');
    expect(venueNote('retail', undefined)).toBe('Venue: Retail & showrooms.');
    expect(venueNote(undefined, '50-150')).toBe('Floor area: 50 – 150 m².');
    expect(venueNote('<img onerror=x>', 'lots')).toBe('');
    expect(venueNote(undefined, undefined)).toBe('');
  });

  it('gives no acoustic advice: the finder module has no sizing or coverage claims', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const src = readFileSync(path.resolve(__dirname, 'home.ts'), 'utf8');
    const strings = [...src.matchAll(/'([^'\n]+)'/g)].map((m) => m[1]).join(' ');
    expect(strings).not.toMatch(/watts? per|speakers? per|recommended|ideal|reverberation|rt60/i);
  });
});
