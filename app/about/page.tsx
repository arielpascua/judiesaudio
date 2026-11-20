import type { Metadata } from 'next';
import Link from 'next/link';
import { FAMILIES } from '@/lib/home';
import { IMAGE_DISCLOSURE, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: `What ${SITE_NAME} is, how the model families are named, and how to read a datasheet here.`,
  alternates: { canonical: '/about' },
};

// No founding year, client names, certifications, warranty or delivery terms, and
// no address: none has been supplied (see lib/site.ts). Say only what the site is.
export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 text-5xl sm:text-7xl">About {SITE_NAME}</h1>
      <p className="mt-6 text-xl leading-relaxed">Sound systems and speakers for businesses, with every specification on the page.</p>

      <div className="mt-10 space-y-12">
        <section aria-labelledby="what">
          <h2 id="what" className="border-t border-ink pt-4 text-3xl">What this site is</h2>
          <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink-muted">
            <p>
              {SITE_NAME} supplies commercial audio to businesses: speakers, subwoofers, ceiling and column
              speakers, amplifiers, processors and complete systems for restaurants, shops, hotels, churches,
              schools, offices, halls and gyms.
            </p>
            <p>
              This website is a catalogue of datasheets. Each model has a specification table and a
              frequency-response graph. When something looks right, <Link className="underline" href="/inquiry">send an inquiry</Link> and
              we follow up using the details you give.
            </p>
          </div>
        </section>

        <section aria-labelledby="names">
          <h2 id="names" className="border-t border-ink pt-4 text-3xl">How the models are named</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Each family is named in Filipino for what it does, and the number or letters after the name tell
            models in a family apart.
          </p>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {FAMILIES.map((f) => (
              <div key={f.series} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="font-display text-2xl">
                  <Link className="inline-flex min-h-[44px] items-center underline" href={`/shop/category/${f.category}`}>{f.series}</Link>
                </dt>
                <dd className="self-center text-ink-muted"><span className="font-display text-lg italic text-ink">{f.meaning}</span>. {f.role}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="read">
          <h2 id="read" className="border-t border-ink pt-4 text-3xl">Reading what you see</h2>
          <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink-muted">
            <p>{IMAGE_DISCLOSURE}</p>
            <p>
              The frequency-response graph on a model page is drawn from the two −10 dB bandwidth figures in
              its specification. It is an idealised shape, not a measurement of a unit, and a model that makes no
              sound (an amplifier or a processor) says so instead of showing a curve.
            </p>
            <p>
              Specifications are nominal. What applies to an order is the datasheet supplied with it and what
              we confirm in writing at the time.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
