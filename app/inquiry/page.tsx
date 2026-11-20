import type { Metadata } from 'next';
import { InquiryForm } from '@/components/inquiry/InquiryForm';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { toInquiryProducts } from '@/lib/catalog/public';
import { venueNote } from '@/lib/home';

export const metadata: Metadata = {
  title: 'Send an inquiry',
  description: 'Tell us about your business and the models you are interested in.',
  alternates: { canonical: '/inquiry' },
};

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<{ product?: Param; venue?: Param; area?: Param }> };

// Only a short string can name a model; anything else (arrays, junk) is ignored, never an error.
const MAX_SLUG = 100;

const one = (value: Param): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 && first.length <= MAX_SLUG ? first : undefined;
};

export default async function InquiryPage({ searchParams: searchParamsPromise }: Props) {
  const { product, venue, area } = await searchParamsPromise;
  // fetchPublicProducts returns PublicProduct[] (no price); the form then gets only what it shows,
  // so no description or application text travels to the browser.
  const products = toInquiryProducts(await fetchPublicProducts());
  // The venue and area from the venue finder become the first line of the note. Whitelisted values only:
  // anything else (a hostile string in the URL) produces no text at all.
  const initialNote = venueNote(one(venue), one(area));

  return (
    <div className="container-page py-10">
      <p className="eyebrow">Inquiries</p>
      <h1 className="mt-2 text-5xl sm:text-6xl">Send an inquiry</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        Tell us about your business and the models you are interested in. An inquiry is a request for
        information: it does not place an order.
      </p>
      <div className="mt-8">
        <InquiryForm products={products} initialSlug={one(product)} initialNote={initialNote} />
      </div>
    </div>
  );
}
