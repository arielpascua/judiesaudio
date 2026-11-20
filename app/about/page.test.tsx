// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AboutPage from '@/app/about/page';
import { FAMILIES } from '@/lib/home';
import { IMAGE_DISCLOSURE, SITE_NAME } from '@/lib/site';

describe('About page', () => {
  it('is about Judie’s Audio and says what the site is', () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? '';
    expect(container.querySelector('h1')?.textContent).toBe(`About ${SITE_NAME}`);
    expect(text).toMatch(/supplies commercial audio to businesses/);
    expect(text).toMatch(/catalogue of datasheets/);
  });

  it('states the image disclosure verbatim and never calls the drawings photographs', () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? '';
    expect(text).toContain(IMAGE_DISCLOSURE);
    expect(text.replace(IMAGE_DISCLOSURE, '')).not.toMatch(/photograph/i);
  });

  it('explains every model family with its Filipino meaning, linked to its product type', () => {
    const { container } = render(<AboutPage />);
    for (const family of FAMILIES) {
      const link = Array.from(container.querySelectorAll('dt a')).find((a) => a.textContent === family.series);
      expect(link, family.series).toBeDefined();
      expect(link!.getAttribute('href')).toBe(`/shop/category/${family.category}`);
      expect(container.textContent).toContain(family.meaning);
    }
  });

  it('says the response graph is idealised and that specifications are nominal', () => {
    const text = render(<AboutPage />).container.textContent ?? '';
    expect(text).toMatch(/idealised shape, not a measurement/);
    expect(text).toMatch(/Specifications are nominal/);
  });

  it('invents no fact: no founding year, client, certification, award, warranty, delivery or reply time, address', () => {
    const text = render(<AboutPage />).container.textContent ?? '';
    expect(text).not.toMatch(/since 20|founded|established|years of experience|trusted by|clients?\b|certified|\bISO\b|award|warranty|within \d|same day|free quote|showroom|branch|headquarter|our office/i);
  });

  it('mentions no price, payment or Maya', () => {
    const text = render(<AboutPage />).container.textContent ?? '';
    expect(text).not.toMatch(/₱|price|pricing|peso|maya|\bpay\b|payment/i);
  });

  it('carries nothing from the rug store', () => {
    const text = render(<AboutPage />).container.textContent ?? '';
    expect(text).not.toMatch(/taruuv|\brugs?\b|carpet/i);
  });

  it('has exactly one h1 and no nested main', () => {
    const { container } = render(<AboutPage />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('main')).toBeNull();
  });
});
