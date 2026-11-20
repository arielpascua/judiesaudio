import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEGAL_DRAFT_NOTICE, LEGAL_SLUGS, legalPage } from '@/lib/legal';
import { CONTACT_EMAIL } from '@/lib/site';

type Params = { slug: string };

// Fixed set of slugs from generateStaticParams; anything else is a 404 without rendering.
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = legalPage(slug);
  return page ? {
        title: page.title,
        alternates: { canonical: `/legal/${slug}` },
        // Draft wording: keep out of search results until the owner approves it.
        robots: { index: false, follow: true },
      } : { title: 'Not found' };
}

export default async function LegalPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = legalPage(slug);
  if (!page) notFound();
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="border border-line bg-chalk-deep px-3 py-2 font-mono text-xs text-ink-muted">{LEGAL_DRAFT_NOTICE}</p>
      <h1 className="mt-6 text-5xl sm:text-6xl">{page.title}</h1>
      {page.sections.map((s) => (
        <section key={s.heading} className="mt-10 border-t border-line pt-8">
          <h2 className="text-2xl">{s.heading}</h2>
          {s.body.map((p) => (<p key={p} className="mt-3 leading-relaxed text-ink-muted">{p}</p>))}
        </section>
      ))}
      {slug === 'privacy' && (
        // The privacy text tells visitors to ask us to delete their inquiry, so it must say how.
        // With no CONTACT_EMAIL configured the channel is the inquiry form: a real, working route, and never an invented address.
        <section className="mt-10 border-t border-line pt-8" aria-labelledby="legal-contact">
          <h2 id="legal-contact" className="text-2xl">How to reach us</h2>
          <p className="mt-3 leading-relaxed text-ink-muted">
            {CONTACT_EMAIL ? (
              <>Email us at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
            ) : (
              <>Send us an inquiry through the <Link className="underline" href="/inquiry">inquiry form</Link> and say you want your information deleted.</>
            )}
          </p>
        </section>
      )}
    </div>
  );
}
