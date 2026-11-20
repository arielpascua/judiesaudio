import { describe, expect, it } from 'vitest';
import {
  DELIVERABLE_COUNTRIES,
  DOMESTIC_COUNTRY,
  MAX_LINE_QUANTITY,
  SHIPPING_FEE_PESOS,
  computeTotals,
} from '@/lib/pricing';

describe('computeTotals', () => {
  it('sums lines to whole pesos and counts items', () => {
    const totals = computeTotals(
      [
        { price: 11_500, quantity: 2 },
        { price: 2_650, quantity: 1 },
      ],
      true,
    );
    expect(totals).toEqual({
      subtotal: 25_650,
      shipping: 0,
      total: 25_650,
      itemCount: 3,
      isDomestic: true,
    });
  });

  it('adds no shipping fee: delivery is confirmed after payment, not priced here', () => {
    expect(SHIPPING_FEE_PESOS).toBe(0);
    expect(computeTotals([{ price: 1_000, quantity: 1 }], false).total).toBe(1_000);
    expect(computeTotals([{ price: 1_000, quantity: 1 }], false).isDomestic).toBe(false);
  });

  it.each([
    ['fractional price', { price: 99.5, quantity: 1 }],
    ['zero price', { price: 0, quantity: 1 }],
    ['negative price', { price: -5, quantity: 1 }],
    ['fractional quantity', { price: 100, quantity: 1.5 }],
    ['zero quantity', { price: 100, quantity: 0 }],
    ['NaN price', { price: Number.NaN, quantity: 1 }],
  ])('rejects a %s instead of repairing it', (_name, line) => {
    expect(() => computeTotals([line], true)).toThrow(RangeError);
  });

  it('exposes the quantity ceiling and the domestic country', () => {
    expect(MAX_LINE_QUANTITY).toBe(20);
    expect(DOMESTIC_COUNTRY).toBe('Philippines');
    expect(DELIVERABLE_COUNTRIES).toContain(DOMESTIC_COUNTRY);
  });
});
