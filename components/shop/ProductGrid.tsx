import type { PublicProduct } from '@/lib/catalog/public';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: readonly PublicProduct[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
