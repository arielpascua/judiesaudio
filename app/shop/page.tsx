import type { Metadata } from 'next';
import { ActiveFilters } from '@/components/shop/ActiveFilters';
import { EmptyState } from '@/components/shop/EmptyState';
import { FilterPanel } from '@/components/shop/FilterPanel';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { fetchPublicProducts } from '@/lib/catalog/client';
import { applyFilters, parseFilters, sortProducts } from '@/lib/shop/filters';

export const metadata: Metadata = {
  title: 'All products',
  description: 'Browse every speaker, subwoofer, amplifier and system by product type, venue, mounting, power and finish.',
  alternates: { canonical: '/shop' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ShopPage({ searchParams: searchParamsPromise }: Props) {
  const searchParams = await searchParamsPromise;
  // Garbage in the URL is dropped by parseFilters; the page always renders.
  const filters = parseFilters(searchParams);
  const products = sortProducts(applyFilters(await fetchPublicProducts(), filters), filters.sort);

  return (
    <div className="container-page py-10">
      <p className="eyebrow">Shop</p>
      <h1 className="mt-2 text-5xl sm:text-6xl">All products</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <div><FilterPanel filters={filters} action="/shop" /></div>
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {/* Only the count is a live region: announcing the whole grid on every filter change is noise. */}
            <p role="status" className="readout text-sm text-ink-muted">{products.length} {products.length === 1 ? 'model' : 'models'}</p>
            <ActiveFilters filters={filters} basePath="/shop" />
          </div>
          {products.length === 0 ? (
            <EmptyState clearHref="/shop" />
          ) : (
            <>
              <h2 className="sr-only">Models</h2>
              <ProductGrid products={products} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
