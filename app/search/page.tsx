import type { Metadata } from 'next';
import { EmptyState } from '@/components/shop/EmptyState';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { applyFilters, parseFilters, sortProducts } from '@/lib/shop/filters';

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams: searchParamsPromise }: Props) {
  const searchParams = await searchParamsPromise;
  const filters = parseFilters({ q: searchParams.q, sort: searchParams.sort });
  const products = filters.q ? sortProducts(applyFilters(await fetchPublicProducts(), filters), filters.sort) : [];

  return (
    <div className="container-page py-10">
      <p className="eyebrow">Search</p>
      <h1 className="mt-2 break-words text-5xl">{filters.q ? `Results for “${filters.q}”` : 'Search models'}</h1>
      <form action="/search" role="search" aria-label="Search models" className="mt-6 flex max-w-lg gap-2">
        <label htmlFor="q" className="sr-only">Search models</label>
        <input id="q" name="q" type="search" defaultValue={filters.q ?? ''} maxLength={80} placeholder="Subwoofer, ceiling, 70 V…" className="field !mt-0 flex-1" />
        <button type="submit" className="btn-primary">Search</button>
      </form>
      <div className="mt-8">
        {filters.q ? (
          products.length === 0 ? (
            <EmptyState
              clearHref="/shop"
              title="No models match that search"
              body="Try a broader word, such as a product type, a family name or a finish."
              ctaLabel="Browse all products"
            />
          ) : (
            <>
              <p role="status" className="readout mb-6 text-sm text-ink-muted">{products.length} {products.length === 1 ? 'model' : 'models'}</p>
              <h2 className="sr-only">Models</h2>
              <ProductGrid products={products} />
            </>
          )
        ) : (
          <p className="text-sm text-ink-muted">Type a product type, a family name such as Himig, a mounting or a finish.</p>
        )}
      </div>
    </div>
  );
}
