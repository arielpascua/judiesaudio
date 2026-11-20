import Link from 'next/link';
import { ProductGrid } from '@/components/shop/ProductGrid';
import type { PublicProduct } from '@/lib/catalog/public';

export function FeaturedRail({ products, total }: { products: PublicProduct[]; total: number }) {
  return (
    <section className="border-t border-ink bg-chalk-deep py-16" aria-labelledby="featured">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Datasheets</p>
            <h2 id="featured" className="mt-3 text-4xl sm:text-5xl">Featured models</h2>
            <p className="mt-3 max-w-lg text-sm text-ink-muted">
              A hand-picked spread across the catalogue. It is not a sales ranking.
            </p>
          </div>
          <Link href="/shop" className="btn-outline">All {total} models</Link>
        </div>
        <div className="mt-8"><ProductGrid products={products} /></div>
      </div>
    </section>
  );
}
