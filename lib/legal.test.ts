import { describe, expect, it } from 'vitest';
import { LEGAL_DRAFT_NOTICE, LEGAL_PAGES, LEGAL_SLUGS, legalPage } from '@/lib/legal';

describe('legal pages', () => {
  it('defines terms and privacy, each with sections and a draft notice', () => {
    expect([...LEGAL_SLUGS]).toEqual(['terms', 'privacy']);
    expect(LEGAL_DRAFT_NOTICE).toMatch(/^Draft/);
    for (const slug of LEGAL_SLUGS) {
      expect(LEGAL_PAGES[slug].title.length).toBeGreaterThan(3);
      expect(LEGAL_PAGES[slug].sections.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('is written for Judie’s Audio and carries nothing from the rug store', () => {
    const text = JSON.stringify(LEGAL_PAGES);
    expect(text).toContain('Judie’s Audio');
    expect(text).not.toMatch(/taruuv|\brugs?\b|carpet/i);
  });

  it('shows no price, peso or payment-provider wording (R-B2B-1)', () => {
    const text = JSON.stringify(LEGAL_PAGES);
    expect(text).not.toMatch(/₱|price|pricing|peso|maya|\bpay\b|\bpaid\b|payment/i);
  });

  it('invents no reply time, quote, warranty, certification or founding year', () => {
    const text = JSON.stringify(LEGAL_PAGES);
    expect(text).not.toMatch(/within \d|hours|business days|free quote|warranty|\bISO\b|since 20|years of experience/i);
  });

  it('says what an inquiry collects, who can read it and how to ask for deletion', () => {
    const privacy = JSON.stringify(LEGAL_PAGES.privacy);
    for (const field of ['company name', 'email address', 'phone number', 'role', 'quantities']) expect(privacy).toContain(field);
    expect(privacy).toMatch(/people who run Judie’s Audio/);
    expect(privacy).toMatch(/delete your inquiry/);
    // The channel (an address, or the inquiry form when none is configured) is rendered by the page, never promised here.
    expect(privacy).not.toMatch(/emailing us/i);
  });

  it('is honest about the private order link and about card details not reaching this site', () => {
    const collect = LEGAL_PAGES.privacy.sections.find((x) => x.heading === 'What we collect');
    const text = collect?.body.join(' ') ?? '';
    expect(text).toMatch(/private order link/);
    expect(text).toMatch(/not on this website/);
  });

  it('says the drawings are schematics and the curve is idealised', () => {
    const terms = JSON.stringify(LEGAL_PAGES.terms);
    expect(terms).toMatch(/schematics/);
    expect(terms).toMatch(/idealised/);
  });

  it('leaves order terms to be agreed in writing with each business customer', () => {
    expect(JSON.stringify(LEGAL_PAGES.terms)).toMatch(/agreed in writing with each business customer/);
  });

  it('legalPage returns the page for the real slugs', () => {
    for (const slug of LEGAL_SLUGS) expect(legalPage(slug)).toBe(LEGAL_PAGES[slug]);
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty', '', 'Terms', 'terms ', 'returns', 'unknown'])(
    'legalPage(%j) is null',
    (slug) => {
      expect(legalPage(slug)).toBeNull();
    },
  );
});
