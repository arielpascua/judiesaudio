import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductArt } from '@/components/art/ProductArt';
import { ResponseCurve } from '@/components/art/ResponseCurve';
import { SpecTable } from '@/components/product/SpecTable';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { fetchPublicProductBySlug, fetchPublicProducts } from '@/lib/catalog/client';
import { FAMILIES } from '@/lib/home';
import { jsonLdScript, productJsonLd } from '@/lib/models/jsonld';
import { facetValueLabel } from '@/lib/shop/facets';
import { headlineSpec } from '@/lib/shop/spec-format';
import { IMAGE_DISCLOSURE } from '@/lib/site';

type Params = { slug: string };

// The model pages are the catalogue: public, price-free, indexable. An unknown slug is a 404.
export const dynamicParams = false;
export const revalidate = 60;

export async function generateStaticParams(): Promise<Params[]> {
  return (await fetchPublicProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchPublicProductBySlug(slug);
  if (!product) return { title: 'Not found', robots: { index: false } };
  return {
    title: `${product.name} datasheet`,
    description: `${product.shortDescription} ${headlineSpec(product)}. Specification table and frequency response for the ${product.name}.`,
    alternates: { canonical: `/models/${product.slug}` },
  };
}

export default async function ModelPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await fetchPublicProductBySlug(slug);
  if (!product) notFound();

  const category = facetValueLabel('category', product.category) ?? product.category;
  const family = FAMILIES.find((f) => f.series === product.series);
  const siblings = (await fetchPublicProducts()).filter((p) => p.series === product.series && p.id !== product.id);
  const inquiry = `/inquiry?product=${encodeURIComponent(product.slug)}`;

  return (
    <article className="container-page py-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }} />

      <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.1em] text-ink-muted">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li><Link className="inline-flex min-h-[44px] items-center underline" href="/shop">All products</Link></li>
          <li aria-hidden>/</li>
          <li><Link className="inline-flex min-h-[44px] items-center underline" href={`/shop/category/${product.category}`}>{category}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <figure>
          <div className="faceplate border border-ink p-6 sm:p-10">
            <ProductArt
              art={product.art}
              finishHex={product.finish.hex}
              woofers={product.specs.woofers}
              wooferIn={product.specs.wooferIn}
              label={`Schematic drawing of the ${product.name} in ${product.finish.name}`}
              className="mx-auto aspect-square w-full max-w-md"
            />
          </div>
          <figcaption className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 border border-ink" style={{ backgroundColor: product.finish.hex }} />
              <span className="font-mono uppercase tracking-wider">{product.finish.name}</span>
            </span>
            <span>{IMAGE_DISCLOSURE}</span>
          </figcaption>
        </figure>

        <div>
          <p className="eyebrow">
            {product.series}
            {family ? ` · ${family.meaning}` : ''} · {category}
          </p>
          <h1 className="mt-3 text-5xl leading-none sm:text-7xl">{product.name}</h1>
          <p className="mt-5 text-lg text-ink-muted">{product.shortDescription}</p>
          <p className="readout mt-5 border-y border-ink py-3 text-lg">{headlineSpec(product)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={inquiry} className="btn-primary">Ask about this model</Link>
            <Link href="/shop" className="btn-outline">Back to all models</Link>
          </div>
          <div className="mt-8">
            <h2 className="eyebrow">Supplied as</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {product.packs.map((pack) => (
                <li key={pack.id} className="chip">{pack.label}{pack.units > 1 ? ` · ${pack.units}` : ''}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <section aria-labelledby="specs">
          <h2 id="specs" className="text-3xl sm:text-4xl">Specifications</h2>
          <div className="mt-4"><SpecTable product={product} /></div>
          <p className="mt-3 text-xs text-ink-muted">
            Specifications are nominal. The datasheet supplied with your order is what applies.
          </p>
        </section>
        <section aria-labelledby="response">
          <h2 id="response" className="text-3xl sm:text-4xl">Response</h2>
          <ResponseCurve lowHz={product.specs.lowHz} highHz={product.specs.highHz} name={product.name} className="mt-4" />
        </section>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <section aria-labelledby="about-model">
          <h2 id="about-model" className="text-3xl sm:text-4xl">About this model</h2>
          <div className="mt-4 space-y-3 leading-relaxed text-ink-muted">
            {product.description.map((p) => <p key={p}>{p}</p>)}
          </div>
          <h3 className="eyebrow mt-8">Listed for</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {product.applications.map((a) => (
              <li key={a}>
                <Link className="chip" href={`/shop/application/${a}`}>{facetValueLabel('application', a) ?? a}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="install">
          <h2 id="install" className="text-3xl sm:text-4xl">Install notes</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {product.install.map((note) => (
              <li key={note} className="py-3 text-sm leading-relaxed">{note}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="on-dark mt-14 flex flex-wrap items-center justify-between gap-6 bg-graphite p-6 text-chalk sm:p-10" aria-labelledby="ask">
        <div className="max-w-xl">
          <h2 id="ask" className="text-3xl sm:text-4xl">Interested in the {product.name}?</h2>
          <p className="mt-2 text-chalk/80">Send an inquiry with the pack and quantity you have in mind. It commits neither of us to anything.</p>
        </div>
        <Link href={inquiry} className="btn-signal">Ask about this model</Link>
      </section>

      {siblings.length > 0 && (
        <section className="mt-14" aria-labelledby="family">
          <h2 id="family" className="text-3xl sm:text-4xl">More in {product.series}</h2>
          <div className="mt-6"><ProductGrid products={siblings} /></div>
        </section>
      )}
    </article>
  );
}
