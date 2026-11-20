import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, CONTACT_PHONE, IMAGE_DISCLOSURE, SITE_NAME, TAGLINE, formatPhone, siteBase } from '@/lib/site';

describe('siteBase', () => {
  it('strips any number of trailing slashes and leaves the rest alone', () => {
    expect(siteBase('https://shop.example.com///')).toBe('https://shop.example.com');
    expect(siteBase('https://shop.example.com/')).toBe('https://shop.example.com');
    expect(siteBase('https://shop.example.com')).toBe('https://shop.example.com');
    expect(siteBase('https://shop.example.com/sub/')).toBe('https://shop.example.com/sub');
  });
});

describe('site facts', () => {
  it('names the business Judie’s Audio and nothing from the rug store', () => {
    expect(SITE_NAME).toBe("Judie's Audio");
    expect(`${SITE_NAME} ${TAGLINE} ${IMAGE_DISCLOSURE}`).not.toMatch(/taruuv|rug/i);
  });

  it('has no contact details unless the owner sets them (nothing is invented)', () => {
    // The test environment sets neither variable.
    expect(CONTACT_EMAIL).toBeNull();
    expect(CONTACT_PHONE).toBeNull();
  });

  it('says plainly that drawings are schematics, not photographs', () => {
    expect(IMAGE_DISCLOSURE).toMatch(/schematics/);
    expect(IMAGE_DISCLOSURE).toMatch(/not photographs/);
  });

  it('formats a Philippine mobile number for display and leaves anything else alone', () => {
    expect(formatPhone('+639171234567')).toBe('+63 917 123 4567');
    expect(formatPhone('+14155550100')).toBe('+14155550100');
  });
});
