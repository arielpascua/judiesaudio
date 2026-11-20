import { describe, expect, it } from 'vitest';
import {
  ALL_COUNTRIES,
  COUNTRY_NAMES,
  countryCode,
  isRestrictedCountry,
} from '@/lib/countries';

describe('countries', () => {
  it('carries the full ISO 3166-1 set of 249 entries', () => {
    expect(ALL_COUNTRIES).toHaveLength(249);
  });

  it('offers the Philippines', () => {
    expect(COUNTRY_NAMES).toContain('Philippines');
    expect(countryCode('Philippines')).toBe('PH');
  });

  it('does not offer embargoed destinations but still recognises them', () => {
    for (const name of ['Cuba', 'Iran', 'North Korea', 'Syria']) {
      expect(isRestrictedCountry(name)).toBe(true);
      expect(COUNTRY_NAMES).not.toContain(name);
    }
  });

  it('treats an ordinary country and a non-country differently', () => {
    expect(isRestrictedCountry('Spain')).toBe(false);
    expect(isRestrictedCountry('Philipines')).toBe(false);
    expect(COUNTRY_NAMES).not.toContain('Philipines');
  });
});
