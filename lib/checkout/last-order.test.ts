// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { LAST_ORDER_KEY, clearLastOrder, loadLastOrder, saveLastOrder } from '@/lib/checkout/last-order';

const order = { reference: 'JA-ABCD12345678', total: 5000, at: Date.now() };

beforeEach(() => localStorage.clear());

describe('last order memory', () => {
  it('round-trips and clears', () => {
    saveLastOrder(order);
    expect(loadLastOrder()).toEqual(order);
    clearLastOrder();
    expect(loadLastOrder()).toBeNull();
  });

  it('uses a Judie’s Audio key, not a legacy one', () => {
    expect(LAST_ORDER_KEY).toBe('judiesaudio-last-order');
    saveLastOrder(order);
    expect(Object.keys(localStorage)).toEqual(['judiesaudio-last-order']);
  });

  it('ignores corrupt, malformed and stale entries', () => {
    localStorage.setItem(LAST_ORDER_KEY, '{nope');
    expect(loadLastOrder()).toBeNull();
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ ...order, at: Date.now() - 40 * 24 * 3600 * 1000 }));
    expect(loadLastOrder()).toBeNull();
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ reference: 5 }));
    expect(loadLastOrder()).toBeNull();
  });
});
