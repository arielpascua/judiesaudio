import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES, LEGAL_SLUGS } from '@/lib/legal';
import { dynamicParams, generateMetadata, generateStaticParams } from '@/app/legal/[slug]/page';

describe('legal page metadata', () => {
  it('keeps the draft pages out of search engines until the owner approves them', async () => {
    for (const slug of LEGAL_SLUGS) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug }) });
      expect(meta.title).toBe(LEGAL_PAGES[slug].title);
      expect(meta.robots).toEqual({ index: false, follow: true });
      expect(meta.alternates?.canonical).toBe(`/legal/${slug}`);
    }
  });

  it('gives hostile slugs no page metadata', async () => {
    for (const slug of ['__proto__', 'constructor', 'toString']) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug }) });
      expect(meta.title).toBe('Not found');
    }
  });

  it('pre-renders exactly the legal slugs', () => {
    expect(generateStaticParams()).toEqual(LEGAL_SLUGS.map((slug) => ({ slug })));
  });

  it('404s any other slug without rendering (dynamicParams is off)', () => {
    expect(dynamicParams).toBe(false);
  });
});
