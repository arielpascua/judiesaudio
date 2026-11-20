import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { toPublicProduct, toPublicProducts } from '@/lib/catalog/public';
import { jsonLdScript, productJsonLd } from '@/lib/models/jsonld';
import { formatHz, specRows } from '@/lib/shop/spec-format';

const byId = (id: string) => toPublicProduct(PRODUCTS.find((p) => p.id === id)!);
const row = (id: string, label: string) => specRows(byId(id)).find((r) => r.label === label)!.value;

describe('formatHz', () => {
  it('uses Hz below 1 kHz and kHz from there, trimming a trailing .0', () => {
    expect(formatHz(55)).toBe('55 Hz');
    expect(formatHz(999)).toBe('999 Hz');
    expect(formatHz(1000)).toBe('1 kHz');
    expect(formatHz(16500)).toBe('16.5 kHz');
    expect(formatHz(20000)).toBe('20 kHz');
  });
});

describe('specRows', () => {
  it('lists the datasheet rows in order, from the catalogue numbers', () => {
    expect(specRows(byId('ja-fr-02')).map((r) => r.label)).toEqual([
      'Bandwidth (−10 dB)', 'Max SPL at 1 m', 'Power (continuous)', 'Impedance', 'Constant voltage (70/100 V)',
      'Coverage (H × V)', 'Drivers', 'Ingress protection', 'Weight', 'Dimensions (W × H × D)', 'Mounting', 'Finish',
    ]);
    expect(row('ja-fr-02', 'Bandwidth (−10 dB)')).toBe('55 Hz – 20 kHz');
    expect(row('ja-fr-02', 'Max SPL at 1 m')).toBe('124 dB');
    expect(row('ja-fr-02', 'Power (continuous)')).toBe('250 W');
    expect(row('ja-fr-02', 'Impedance')).toBe('8 Ω');
    expect(row('ja-fr-02', 'Constant voltage (70/100 V)')).toBe('Yes');
    expect(row('ja-fr-02', 'Dimensions (W × H × D)')).toBe('260 × 420 × 250 mm');
    expect(row('ja-fr-02', 'Mounting')).toBe('Wall');
    expect(row('ja-fr-02', 'Finish')).toBe('Gallery White');
  });

  it('says "Not applicable" where a number has no meaning, and "Not rated" for no IP rating', () => {
    expect(row('ja-am-01', 'Bandwidth (−10 dB)')).toBe('Not applicable');
    expect(row('ja-am-01', 'Max SPL at 1 m')).toBe('Not applicable');
    expect(row('ja-am-01', 'Coverage (H × V)')).toBe('Not applicable');
    expect(row('ja-am-03', 'Power (continuous)')).toBe('Not applicable');
    expect(row('ja-fr-02', 'Ingress protection')).toBe('Not rated');
    expect(row('ja-ou-01', 'Ingress protection')).toBe('IP55');
  });

  it('reports a 70/100 V-only speaker rather than an impedance, and No for low-impedance models', () => {
    expect(row('ja-ce-01', 'Impedance')).toBe('70 V / 100 V line only');
    expect(row('ja-sw-02', 'Constant voltage (70/100 V)')).toBe('No');
  });

  it('every product yields a value for every row', () => {
    for (const p of toPublicProducts(PRODUCTS)) for (const r of specRows(p)) expect(r.value.length, `${p.id} ${r.label}`).toBeGreaterThan(0);
  });
});

describe('productJsonLd: a Product with no offer', () => {
  const ld = productJsonLd(byId('ja-fr-02'), 'https://example.test');

  it('describes the model and links to its datasheet', () => {
    expect(ld['@type']).toBe('Product');
    expect(ld.name).toBe('Himig 8');
    expect(ld.sku).toBe('ja-fr-02');
    expect(ld.url).toBe('https://example.test/models/himig-8');
  });

  it('carries no offer, price, availability or image (R-B2B-1)', () => {
    const text = JSON.stringify(ld);
    expect(ld).not.toHaveProperty('offers');
    expect(ld).not.toHaveProperty('image');
    expect(text).not.toMatch(/offer|price|availability|₱|peso/i);
  });

  it('lists specification properties, leaving out the not-applicable ones', () => {
    const names = (ld.additionalProperty as { name: string }[]).map((p) => p.name);
    expect(names).toContain('Max SPL at 1 m');
    const amp = productJsonLd(byId('ja-am-01'));
    expect((amp.additionalProperty as { name: string }[]).map((p) => p.name)).not.toContain('Bandwidth (−10 dB)');
  });

  it('escapes "<" so a value can never close the script tag', () => {
    expect(jsonLdScript({ name: '</script><b>' })).not.toContain('<');
    expect(JSON.parse(jsonLdScript({ name: '</script><b>' })).name).toBe('</script><b>');
  });
});
