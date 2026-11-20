// Remembers the last payment link we sent this browser to. It exists so a
// customer who comes back from Maya sees their reference and a truthful
// "pending" note. It does NOT record whether they paid; nothing can.

export interface LastOrder {
  reference: string;
  total: number;
  at: number;
}

const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
export const LAST_ORDER_KEY = 'judiesaudio-last-order';

export function saveLastOrder(order: LastOrder): void {
  try {
    window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* storage unavailable: the order itself is unaffected */
  }
}

export function loadLastOrder(): LastOrder | null {
  try {
    const raw = window.localStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastOrder> | null;
    if (
      !v ||
      typeof v.reference !== 'string' ||
      typeof v.total !== 'number' ||
      typeof v.at !== 'number' ||
      Date.now() - v.at > MAX_AGE_MS
    ) {
      return null;
    }
    return { reference: v.reference, total: v.total, at: v.at };
  } catch {
    return null;
  }
}

export function clearLastOrder(): void {
  try {
    window.localStorage.removeItem(LAST_ORDER_KEY);
  } catch {
    /* ignore */
  }
}
