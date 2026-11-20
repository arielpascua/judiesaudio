'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductArt } from '@/components/art/ProductArt';
import { useCartUi } from '@/components/cart/CartProvider';
import type { CatalogueIndex, IndexedProduct } from '@/lib/catalog';
import { CATEGORIES } from '@/lib/catalog/types';
import { useCartStore } from '@/lib/cart/store';
import { formatPeso } from '@/lib/format';
import { MAX_LINE_QUANTITY } from '@/lib/limits';
import { CATEGORY_LABELS } from './categories';
import { fieldClass } from './Field';

const ANNOUNCE_MS = 4000;

/**
 * Adds products to the order from the WHOLE catalogue, grouped by category.
 * Prices come from the server-rendered index, never from storage.
 */
export function ProductPicker({ index }: { index: CatalogueIndex }) {
  const add = useCartStore((s) => s.add);
  const lines = useCartStore((s) => s.lines);
  // An add made before the persisted order rehydrates would be overwritten and lost.
  const { hydrated } = useCartUi();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  // `nonce` gives each announcement its own DOM node, so adding the same product twice is
  // spoken again; the message clears after a few seconds instead of lingering forever.
  const [announcement, setAnnouncement] = useState<{ text: string; nonce: number } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);
  function announce(text: string) {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setAnnouncement((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }));
    clearTimer.current = setTimeout(() => setAnnouncement(null), ANNOUNCE_MS);
  }

  const groups = useMemo(() => {
    const all = Object.values(index).filter((p) => p.packs.length > 0); // a product with no packs cannot be priced or sold
    return CATEGORIES.map((category) => ({ category, products: all.filter((p) => p.category === category) })).filter((g) => g.products.length > 0);
  }, [index]);

  const inOrder = (productId: string) => lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0);

  // A plain function, not a component: a component defined here would be a new type on every
  // render and remount (and blur) the pack <select> each time it changed.
  function renderRow(product: IndexedProduct) {
    const packId = chosen[product.id] ?? product.packs[0].id;
    const pack = product.packs.find((p) => p.id === packId) ?? product.packs[0];
    const atCeiling = inOrder(product.id) >= MAX_LINE_QUANTITY;
    const unavailable = !product.inStock;
    return (
      <li key={product.id} className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 border border-line bg-white p-3 text-sm">
        <div className="h-16 w-16 border border-line bg-chalk-deep">
          {/* The name is printed beside the drawing: it is decorative here. */}
          <ProductArt art={product.art} finishHex={product.finishHex} woofers={product.woofers} wooferIn={product.wooferIn} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{product.name}</p>
          <p className="text-ink-muted">
            {product.series} · {product.finishName}
          </p>
          <p className="readout text-xs text-ink-muted">from {formatPeso(Math.min(...product.packs.map((p) => p.price)))}</p>
        </div>
        <div className="col-span-2 flex min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={`add-pack-${product.id}`} className="sr-only">
              Pack to add for {product.name}
            </label>
            <select
              id={`add-pack-${product.id}`}
              value={pack.id}
              onChange={(e) => setChosen((c) => ({ ...c, [product.id]: e.target.value }))}
              className={`${fieldClass} mt-0`}
            >
              {product.packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {formatPeso(p.price)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={unavailable || atCeiling || !hydrated}
            onClick={() => {
              add({ productId: product.id, packId: pack.id, quantity: 1 });
              announce(`Added ${product.name}, ${pack.label}, to your order`);
            }}
            aria-label={unavailable ? `${product.name}: out of stock` : atCeiling ? `${product.name}: order limit reached` : `Add ${product.name}, ${pack.label}`}
            className="btn-quiet shrink-0 px-4"
          >
            {unavailable ? 'Out of stock' : atCeiling ? 'Limit' : 'Add'}
          </button>
        </div>
      </li>
    );
  }

  return (
    <section aria-labelledby="add-products">
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
        <h2 id="add-products" className="font-display text-2xl">
          Add products
        </h2>
        <p className="eyebrow">Whole catalogue</p>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Drawings are schematics generated from each specification, not photographs.
      </p>

      <div className="mt-4 space-y-8">
        {groups.map(({ category, products }) => (
          <div key={category} role="group" aria-labelledby={`cat-${category}`}>
            <h3 id={`cat-${category}`} className="eyebrow flex items-center gap-3 text-ink">
              <span>{CATEGORY_LABELS[category]}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
              <span className="readout text-ink-muted">{products.length}</span>
            </h3>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {products.map((product) => renderRow(product))}
            </ul>
          </div>
        ))}
      </div>

      {/* Always mounted so screen readers pick up the change; plain aria-live (not role=status) keeps it out of the page's status landmarks. */}
      <p aria-live="polite" aria-atomic="true" className="mt-4 min-h-[1.25rem] text-sm text-ink-muted">
        {announcement ? <span key={announcement.nonce}>{announcement.text}</span> : null}
      </p>
    </section>
  );
}
