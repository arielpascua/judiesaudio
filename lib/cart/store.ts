import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { MAX_LINE_QUANTITY } from '@/lib/limits';
import type { CartLine } from './resolve';

export const CART_STORAGE_KEY = 'judiesaudio-cart-v1';

const sameLine = (l: CartLine, productId: string, packId: string) =>
  l.productId === productId && l.packId === packId;

/** How many more of this PRODUCT (across all its packs) may be added. */
function allowance(lines: readonly CartLine[], productId: string, ignorePackId?: string): number {
  const used = lines
    .filter((l) => l.productId === productId && l.packId !== ignorePackId)
    .reduce((n, l) => n + l.quantity, 0);
  return Math.max(0, MAX_LINE_QUANTITY - used);
}

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  if (!Number.isFinite(line.quantity)) return lines;
  const wanted = Math.floor(line.quantity);
  if (wanted < 1) return lines;
  const room = allowance(lines, line.productId);
  const add = Math.min(wanted, room);
  if (add <= 0) return lines;
  const existing = lines.find((l) => sameLine(l, line.productId, line.packId));
  if (existing) {
    return lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + add } : l));
  }
  return [...lines, { productId: line.productId, packId: line.packId, quantity: add }];
}

export function setLineQuantity(
  lines: CartLine[],
  productId: string,
  packId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isFinite(quantity)) return lines;
  const wanted = Math.floor(quantity);
  if (wanted < 1) return removeLine(lines, productId, packId);
  const cap = allowance(lines, productId, packId);
  const next = Math.min(wanted, cap);
  if (next <= 0) return removeLine(lines, productId, packId);
  return lines.map((l) => (sameLine(l, productId, packId) ? { ...l, quantity: next } : l));
}

export function removeLine(lines: CartLine[], productId: string, packId: string): CartLine[] {
  return lines.filter((l) => !sameLine(l, productId, packId));
}

/**
 * Switches a line to another pack of the same product, in place. If the order
 * already has a line for the target pack the two merge. The product's total
 * quantity does not change, so the per-product ceiling cannot be crossed.
 */
export function changeLinePack(
  lines: CartLine[],
  productId: string,
  fromPackId: string,
  toPackId: string,
): CartLine[] {
  if (fromPackId === toPackId) return lines;
  const from = lines.find((l) => sameLine(l, productId, fromPackId));
  if (!from) return lines;
  if (!lines.some((l) => sameLine(l, productId, toPackId))) {
    return lines.map((l) => (l === from ? { ...l, packId: toPackId } : l));
  }
  return addLine(removeLine(lines, productId, fromPackId), { productId, packId: toPackId, quantity: from.quantity });
}

const MAX_SANITIZE_ITEMS = 200;

/** Persisted data is untrusted: drop anything malformed, clamp the rest. */
export function sanitizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  let lines: CartLine[] = [];
  // addLine is O(n) per item; bound the work a hostile blob can cause.
  for (const item of raw.slice(0, MAX_SANITIZE_ITEMS)) {
    if (typeof item !== 'object' || item === null) continue;
    const { productId, packId, quantity } = item as Record<string, unknown>;
    if (typeof productId !== 'string' || productId === '' || productId.length > 64) continue;
    if (typeof packId !== 'string' || packId === '' || packId.length > 64) continue;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) continue;
    lines = addLine(lines, { productId, packId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) });
  }
  return lines;
}

interface CartState {
  lines: CartLine[];
  add(line: CartLine): void;
  setQuantity(productId: string, packId: string, quantity: number): void;
  remove(productId: string, packId: string): void;
  changePack(productId: string, fromPackId: string, toPackId: string): void;
  removeMany(keys: { productId: string; packId: string }[]): void;
  clear(): void;
}

export function createCartStore(storage: StateStorage) {
  return create<CartState>()(
    persist(
      (set) => ({
        lines: [],
        add: (line) => set((s) => ({ lines: addLine(s.lines, line) })),
        setQuantity: (productId, packId, quantity) =>
          set((s) => ({ lines: setLineQuantity(s.lines, productId, packId, quantity) })),
        remove: (productId, packId) => set((s) => ({ lines: removeLine(s.lines, productId, packId) })),
        changePack: (productId, fromPackId, toPackId) =>
          set((s) => ({ lines: changeLinePack(s.lines, productId, fromPackId, toPackId) })),
        removeMany: (keys) =>
          set((s) => ({
            lines: s.lines.filter((l) => !keys.some((k) => sameLine(l, k.productId, k.packId))),
          })),
        clear: () => set({ lines: [] }),
      }),
      {
        name: CART_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        // Hydrated explicitly from CartProvider after mount, so the server and
        // first client render agree (an empty cart) and React does not warn.
        skipHydration: true,
        partialize: (s) => ({ lines: s.lines }),
        merge: (persisted, current) => ({
          ...current,
          lines: sanitizeLines((persisted as { lines?: unknown } | null | undefined)?.lines),
        }),
      },
    ),
  );
}

/** localStorage can be missing (SSR) or throw (private mode, blocked storage). */
function browserStorage(): StateStorage {
  const safe = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  return {
    getItem: (k) => safe(() => (typeof window === 'undefined' ? null : window.localStorage.getItem(k)), null),
    setItem: (k, v) => safe(() => void (typeof window !== 'undefined' && window.localStorage.setItem(k, v)), undefined),
    removeItem: (k) => safe(() => void (typeof window !== 'undefined' && window.localStorage.removeItem(k)), undefined),
  };
}

export const useCartStore = createCartStore(browserStorage());
