import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { facetDef, facetValueLabel } from '@/lib/shop/facets';
import { applyFilters } from '@/lib/shop/filters';
import { landingFilters, landingParams } from '@/lib/shop/landing';

type Params = { facet: string; value: string };

export async function generateStaticParams(): Promise<Params[]> {
  return landingParams(await fetchPublicProducts());
}

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { facet: facetKey, value } = await params;
  const label = facetValueLabel(facetKey, value);
  if (!label) return { title: 'Not found', robots: { index: false } };
  const facet = facetDef(facetKey)!;
  return {
    title: label,
    description: `Browse Judie's Audio models by ${facet.label.toLowerCase()}: ${label}. Read each datasheet and send an inquiry for the ones you want.`,
    alternates: { canonical: `/shop/${facetKey}/${value}` },
  };
}

export default async function LandingPage({ params }: { params: Promise<Params> }) {
  const { facet: facetKey, value } = await params;
  const filters = landingFilters(facetKey, value);
  if (!filters) notFound();
  const label = facetValueLabel(facetKey, value)!;
  const products = applyFilters(await fetchPublicProducts(), filters);
  if (products.length === 0) notFound();

  return (
    <div className="container-page py-10">
      <p className="eyebrow">By {facetDef(facetKey)!.label.toLowerCase()}</p>
      <h1 className="mt-2 text-5xl sm:text-6xl">{label}</h1>
      <p className="readout mt-3 text-sm text-ink-muted">
        {products.length} {products.length === 1 ? 'model' : 'models'}.{' '}
        <Link href={`/shop?${facetKey}=${value}`} className="inline-flex min-h-[44px] items-center font-sans underline">
          Refine and sort
        </Link>
      </p>
      <div className="mt-8">
        <h2 className="sr-only">Models</h2>
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
