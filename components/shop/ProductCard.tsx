import Link from 'next/link';
import { ProductArt } from '@/components/art/ProductArt';
import type { PublicProduct } from '@/lib/catalog/public';
import { facetValueLabel } from '@/lib/shop/facets';
import { headlineSpec } from '@/lib/shop/spec-format';

// A compact datasheet card. There is no rating, badge or price: the public
// catalogue shows none (R-B2B-1), and PublicProduct carries no price to leak.
// Every card opens that model's datasheet.
export function ProductCard({ product }: { product: PublicProduct }) {
  const category = facetValueLabel('category', product.category) ?? product.category;
  return (
    <Link href={`/models/${product.slug}`} className="group flex h-full flex-col border border-line bg-white transition-colors hover:border-ink">
      {/* The name is printed below, so the drawing is decorative here (no duplicate announcement). */}
      <div className="faceplate border-b border-line p-4">
        <ProductArt
          art={product.art}
          finishHex={product.finish.hex}
          woofers={product.specs.woofers}
          wooferIn={product.specs.wooferIn}
          className="mx-auto aspect-square w-full max-w-[11rem] transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow">{product.series}</p>
        <h3 className="mt-1 font-display text-2xl leading-tight">{product.name}</h3>
        <p className="readout mt-3 text-[13px] text-ink">{headlineSpec(product)}</p>
        <p className="mt-auto pt-4"><span className="chip">{category}</span></p>
      </div>
    </Link>
  );
}
