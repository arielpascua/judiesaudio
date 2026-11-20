import { describe, expect, it } from 'vitest';
import { buildCatalogueIndex } from '@/lib/catalog';
import { PRODUCTS } from '@/lib/catalog/fixtures';
import { resolveCart } from '@/lib/cart/resolve';

const index = buildCatalogueIndex(PRODUCTS);
const fr01 = PRODUCTS.find((p) => p.id === 'ja-fr-01')!;
const am01 = PRODUCTS.find((p) => p.id === 'ja-am-01')!;
const price = (product: typeof fr01, id: string) => product.packs.find((p) => p.id === id)!.price;

describe('resolveCart', () => {
  it('is one order: it prices every line from the catalogue index and sums them', () => {
    const cart = resolveCart(
      [
        { productId: 'ja-am-01', packId: 'single', quantity: 1 },
        { productId: 'ja-fr-01', packId: 'pair', quantity: 2 },
      ],
      index,
    );
    expect(cart.lines.map((l) => l.product.id)).toEqual(['ja-am-01', 'ja-fr-01']);
    expect(cart.subtotal).toBe(price(am01, 'single') + price(fr01, 'pair') * 2);
    expect(cart.itemCount).toBe(3);
    expect(cart.unitCount).toBe(1 + 2 * 2);
    expect(cart.unavailable).toEqual([]);
  });

  it('an empty cart resolves to an empty order', () => {
    const cart = resolveCart([], index);
    expect(cart).toMatchObject({ lines: [], subtotal: 0, itemCount: 0, unitCount: 0, unavailable: [] });
  });

  it('flags a removed product, a removed pack and an out-of-stock product, and excludes them from totals', () => {
    const stale = { ...index, 'ja-am-01': { ...index['ja-am-01'], inStock: false } };
    const cart = resolveCart(
      [
        { productId: 'ja-gone-99', packId: 'single', quantity: 1 },
        { productId: 'ja-fr-01', packId: 'pack-10', quantity: 1 },
        { productId: 'ja-am-01', packId: 'single', quantity: 1 },
        { productId: 'ja-fr-01', packId: 'single', quantity: 1 },
      ],
      stale,
    );
    expect(cart.unavailable.map((u) => u.reason)).toEqual(['unknown', 'pack', 'out-of-stock']);
    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotal).toBe(price(fr01, 'single'));
  });

  it('uses the CURRENT catalogue price, never a stored one', () => {
    const repriced = {
      ...index,
      'ja-fr-01': { ...index['ja-fr-01'], packs: index['ja-fr-01'].packs.map((p) => ({ ...p, price: 1_000 })) },
    };
    const cart = resolveCart([{ productId: 'ja-fr-01', packId: 'single', quantity: 3 }], repriced);
    expect(cart.subtotal).toBe(3_000);
  });

  it('treats hostile ids like "constructor" and "__proto__" as unknown products without throwing', () => {
    const lines = [
      { productId: 'constructor', packId: 'single', quantity: 1 },
      { productId: '__proto__', packId: 'single', quantity: 1 },
    ];
    const cart = resolveCart(lines, buildCatalogueIndex(PRODUCTS));
    expect(cart.lines).toEqual([]);
    expect(cart.unavailable).toEqual([
      { line: lines[0], reason: 'unknown' },
      { line: lines[1], reason: 'unknown' },
    ]);
  });
});
