import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { MAX_LINE_QUANTITY } from '@/lib/limits';
import {
  CART_STORAGE_KEY,
  addLine,
  changeLinePack,
  createCartStore,
  removeLine,
  sanitizeLines,
  setLineQuantity,
} from '@/lib/cart/store';

function memoryStorage(initial: Record<string, string> = {}): StateStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const line = (productId: string, packId: string, quantity: number) => ({ productId, packId, quantity });

describe('cart storage key', () => {
  it('is a Judie’s Audio key', () => {
    expect(CART_STORAGE_KEY).toBe('judiesaudio-cart-v1');
  });
});

describe('cart helpers', () => {
  it('merges a repeated product+pack and keeps different packs as separate lines', () => {
    let lines = addLine([], line('a', 'single', 1));
    lines = addLine(lines, line('a', 'single', 2));
    lines = addLine(lines, line('a', 'pair', 1));
    expect(lines).toEqual([line('a', 'single', 3), line('a', 'pair', 1)]);
  });

  it('caps a product at the ceiling summed ACROSS its packs', () => {
    let lines = addLine([], line('a', 'single', 15));
    lines = addLine(lines, line('a', 'pair', 15));
    const total = lines.filter((l) => l.productId === 'a').reduce((n, l) => n + l.quantity, 0);
    expect(total).toBe(MAX_LINE_QUANTITY);
    expect(addLine(lines, line('a', 'pair', 1))).toEqual(lines);
  });

  it('sets a quantity within 1..allowance and removes the line at 0', () => {
    const base = [line('a', 'single', 2), line('a', 'pair', 5)];
    expect(setLineQuantity(base, 'a', 'single', 4)[0].quantity).toBe(4);
    expect(setLineQuantity(base, 'a', 'single', 999)[0].quantity).toBe(MAX_LINE_QUANTITY - 5);
    expect(setLineQuantity(base, 'a', 'single', 0)).toEqual([line('a', 'pair', 5)]);
  });

  it('removes one line', () => {
    expect(removeLine([line('a', 'single', 1), line('b', 'pair', 1)], 'a', 'single')).toEqual([line('b', 'pair', 1)]);
  });

  it('sanitizes hostile persisted data', () => {
    expect(
      sanitizeLines([
        line('ok', 'single', 2),
        { productId: 5 },
        null,
        'string',
        line('neg', 'single', -3),
        line('frac', 'single', 1.5),
        line('zero', 'single', 0),
        line('', 'single', 1),
        line('big', 'single', 5000),
      ]),
    ).toEqual([line('ok', 'single', 2), line('big', 'single', MAX_LINE_QUANTITY)]);
    expect(sanitizeLines('nope')).toEqual([]);
    expect(sanitizeLines(undefined)).toEqual([]);
  });
});

describe('createCartStore', () => {
  it('persists only ids and quantities, never prices or names', () => {
    const storage = memoryStorage();
    const store = createCartStore(storage);
    store.getState().add(line('ja-fr-01', 'single', 2));
    const saved = JSON.parse(storage.getItem(CART_STORAGE_KEY) as string);
    expect(saved.state).toEqual({ lines: [line('ja-fr-01', 'single', 2)] });
  });

  it('rehydrates a valid cart', async () => {
    const storage = memoryStorage({
      [CART_STORAGE_KEY]: JSON.stringify({ state: { lines: [line('ja-fr-01', 'single', 2)] }, version: 1 }),
    });
    const store = createCartStore(storage);
    await store.persist.rehydrate();
    expect(store.getState().lines).toEqual([line('ja-fr-01', 'single', 2)]);
  });

  it('survives corrupt localStorage without crashing', async () => {
    for (const raw of ['{not json', JSON.stringify({ state: { lines: 'x' }, version: 1 }), JSON.stringify(null)]) {
      const store = createCartStore(memoryStorage({ [CART_STORAGE_KEY]: raw }));
      await store.persist.rehydrate();
      expect(store.getState().lines).toEqual([]);
    }
  });

  it('removeMany and clear', () => {
    const store = createCartStore(memoryStorage());
    store.getState().add(line('a', 'single', 1));
    store.getState().add(line('b', 'pair', 1));
    store.getState().add(line('c', 'pack-4', 1));
    store.getState().removeMany([{ productId: 'a', packId: 'single' }, { productId: 'b', packId: 'pair' }]);
    expect(store.getState().lines).toEqual([line('c', 'pack-4', 1)]);
    store.getState().clear();
    expect(store.getState().lines).toEqual([]);
  });
});

describe('quantity validation in helpers and store actions', () => {
  const valid = (lines: { quantity: number }[]) =>
    lines.every((l) => Number.isInteger(l.quantity) && l.quantity > 0);

  it('addLine ignores NaN, Infinity, negatives, zero and sub-1 fractions', () => {
    const base = [line('a', 'single', 2)];
    for (const q of [NaN, Infinity, -Infinity, -1, 0, 0.5]) {
      const next = addLine(base, line('a', 'single', q));
      expect(next).toEqual(base);
      expect(valid(next)).toBe(true);
      const empty = addLine([], line('b', 'pair', q));
      expect(empty).toEqual([]);
    }
  });

  it('addLine floors fractions', () => {
    expect(addLine([], line('a', 'single', 1.9))).toEqual([line('a', 'single', 1)]);
    expect(addLine([line('a', 'single', 1)], line('a', 'single', 2.7))).toEqual([line('a', 'single', 3)]);
  });

  it('setLineQuantity ignores NaN and +/-Infinity without removing the line', () => {
    const base = [line('a', 'single', 2)];
    for (const q of [NaN, Infinity, -Infinity]) {
      expect(setLineQuantity(base, 'a', 'single', q)).toEqual(base);
    }
  });

  it('setLineQuantity removes the line for a floored quantity below 1 and floors fractions', () => {
    const base = [line('a', 'single', 2)];
    expect(setLineQuantity(base, 'a', 'single', 0.5)).toEqual([]);
    expect(setLineQuantity(base, 'a', 'single', -1)).toEqual([]);
    expect(setLineQuantity(base, 'a', 'single', 2.7)).toEqual([line('a', 'single', 2)]);
    expect(setLineQuantity(base, 'a', 'single', 3.9)).toEqual([line('a', 'single', 3)]);
  });

  it('store actions never let a bad quantity into state', () => {
    const store = createCartStore(memoryStorage());
    const { add } = store.getState();
    for (const q of [NaN, Infinity, -Infinity, -1, 0, 0.5, 1.9, 2.7, 1e9]) {
      add(line('a', 'single', q));
      expect(valid(store.getState().lines)).toBe(true);
    }
    expect(store.getState().lines).toEqual([line('a', 'single', MAX_LINE_QUANTITY)]);
    store.getState().clear();
    store.getState().add(line('b', 'pair', 2));
    for (const q of [NaN, Infinity, -Infinity]) {
      store.getState().setQuantity('b', 'pair', q);
      expect(store.getState().lines).toEqual([line('b', 'pair', 2)]);
    }
    store.getState().setQuantity('b', 'pair', 2.7);
    expect(store.getState().lines).toEqual([line('b', 'pair', 2)]);
    store.getState().setQuantity('b', 'pair', 0.5);
    expect(store.getState().lines).toEqual([]);
  });
});

describe('sanitizeLines hardening', () => {
  const long = 'x'.repeat(65);

  it('drops ids longer than 64 chars and keeps exactly 64', () => {
    const ok64 = 'y'.repeat(64);
    expect(
      sanitizeLines([line(long, 'single', 1), line('a', long, 1), line(ok64, 'single', 1)]),
    ).toEqual([line(ok64, 'single', 1)]);
  });

  it('drops empty or non-string packId', () => {
    expect(
      sanitizeLines([
        line('a', '', 1),
        { productId: 'a', packId: 5, quantity: 1 },
        { productId: 'a', quantity: 1 },
        line('a', 'single', 1),
      ]),
    ).toEqual([line('a', 'single', 1)]);
  });

  it('merges duplicate product+pack entries', () => {
    expect(sanitizeLines([line('a', 'single', 1), line('a', 'single', 2)])).toEqual([line('a', 'single', 3)]);
  });

  it('applies the cross-pack cap (15+15 of one product => total 20)', () => {
    const out = sanitizeLines([line('a', 'single', 15), line('a', 'pair', 15)]);
    expect(out.reduce((n, l) => n + l.quantity, 0)).toBe(MAX_LINE_QUANTITY);
  });

  it('keeps prototype-key ids as plain strings without polluting Object.prototype', () => {
    const out = sanitizeLines([line('__proto__', 'single', 1), line('constructor', 'pair', 2)]);
    expect(out).toEqual([line('__proto__', 'single', 1), line('constructor', 'pair', 2)]);
    expect(({} as Record<string, unknown>).quantity).toBeUndefined();
    expect(({} as Record<string, unknown>).productId).toBeUndefined();
    expect(Object.keys(Object.prototype)).toEqual([]);
  });

  it('processes at most the first 200 raw items', () => {
    const raw = Array.from({ length: 5000 }, (_, i) => line(`p${i}`, 'single', 1));
    const started = Date.now();
    const out = sanitizeLines(raw);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out).toEqual(raw.slice(0, 200));
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('sanitizes over-cap and hostile entries when rehydrating through the store', async () => {
    const hostile = [
      line('a', 'single', 15),
      line('a', 'pair', 15),
      line('b', 'single', 5000),
      line('c', 'single', 1.5),
      line('d', 'single', -2),
      { productId: 5 },
      null,
      line('__proto__', 'single', 1),
    ];
    const storage = memoryStorage({
      [CART_STORAGE_KEY]: JSON.stringify({ state: { lines: hostile }, version: 1 }),
    });
    const store = createCartStore(storage);
    await store.persist.rehydrate();
    expect(store.getState().lines).toEqual([
      line('a', 'single', 15),
      line('a', 'pair', 5),
      line('b', 'single', MAX_LINE_QUANTITY),
      line('__proto__', 'single', 1),
    ]);
  });
});

describe('changeLinePack', () => {
  it('switches the pack in place and keeps the line position and quantity', () => {
    const base = [line('a', 'single', 2), line('b', 'single', 1), line('c', 'single', 1)];
    expect(changeLinePack(base, 'b', 'single', 'pair')).toEqual([line('a', 'single', 2), line('b', 'pair', 1), line('c', 'single', 1)]);
  });

  it('merges into an existing line for the target pack', () => {
    const base = [line('a', 'single', 2), line('a', 'pair', 3), line('b', 'single', 1)];
    expect(changeLinePack(base, 'a', 'single', 'pair')).toEqual([line('a', 'pair', 5), line('b', 'single', 1)]);
  });

  it('never crosses the per-product ceiling, because the product total is unchanged', () => {
    const base = [line('a', 'single', 12), line('a', 'pair', 8)];
    const out = changeLinePack(base, 'a', 'single', 'pair');
    expect(out.reduce((n, l) => n + l.quantity, 0)).toBe(MAX_LINE_QUANTITY);
  });

  it('is a no-op for the same pack or a line that is not there, and works through the store', () => {
    const base = [line('a', 'single', 2)];
    expect(changeLinePack(base, 'a', 'single', 'single')).toBe(base);
    expect(changeLinePack(base, 'zzz', 'single', 'pair')).toBe(base);
    const store = createCartStore(memoryStorage());
    store.getState().add(line('a', 'single', 2));
    store.getState().changePack('a', 'single', 'pair');
    expect(store.getState().lines).toEqual([line('a', 'pair', 2)]);
  });
});
