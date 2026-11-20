// PURE and CLIENT-SAFE. The persisted cart holds ids and quantities only; every
// price and name shown to the customer is resolved here against the catalogue
// index that a server component rendered. A cart edited in devtools, or left
// over from last month, can therefore change nothing about what is displayed
// or charged.

import type { CatalogueIndex, IndexedProduct } from '@/lib/catalog';
import type { PackId } from '@/lib/catalog/types';

export interface CartLine {
  productId: string;
  packId: string;
  quantity: number;
}

export interface ResolvedLine {
  line: CartLine;
  product: IndexedProduct;
  pack: { id: PackId; label: string; units: number; price: number };
  lineTotal: number;
}

export type UnavailableReason = 'unknown' | 'pack' | 'out-of-stock';

export interface ResolvedCart {
  lines: ResolvedLine[];
  /** Whole pesos: the sum of the lines above (for display only: the server recomputes it). */
  subtotal: number;
  /** Packs ordered. */
  itemCount: number;
  /** Individual units across all packs (packs x units per pack). */
  unitCount: number;
  unavailable: { line: CartLine; reason: UnavailableReason }[];
}

export function resolveCart(lines: readonly CartLine[], index: CatalogueIndex): ResolvedCart {
  const resolved: ResolvedLine[] = [];
  const unavailable: ResolvedCart['unavailable'] = [];

  for (const line of lines) {
    // The index is null-prototype: a hostile id ("constructor", "__proto__") is simply undefined.
    const product: IndexedProduct | undefined = index[line.productId];
    if (!product) {
      unavailable.push({ line, reason: 'unknown' });
      continue;
    }
    const pack = product.packs.find((p) => p.id === line.packId);
    if (!pack) {
      unavailable.push({ line, reason: 'pack' });
      continue;
    }
    if (!product.inStock) {
      unavailable.push({ line, reason: 'out-of-stock' });
      continue;
    }
    resolved.push({ line, product, pack, lineTotal: pack.price * line.quantity });
  }

  return {
    lines: resolved,
    subtotal: resolved.reduce((n, l) => n + l.lineTotal, 0),
    itemCount: resolved.reduce((n, l) => n + l.line.quantity, 0),
    unitCount: resolved.reduce((n, l) => n + l.line.quantity * l.pack.units, 0),
    unavailable,
  };
}
