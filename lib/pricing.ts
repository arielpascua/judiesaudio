// THE ONE PLACE THE CHARGED TOTAL IS COMPUTED. The server's checkout route calls
// computeTotals on prices it reads from its own catalogue, and that result is
// the `amt` on the Maya payment link and the total stored with the order. The
// cart and checkout pages do NOT call it: they sum the lines they resolved
// against the server-rendered catalogue index (lib/cart/resolve.ts) for display
// only, and the checkout client compares both the subtotal and the total of that
// sum with the amount shown before sending anyone to pay. Everything is whole pesos.

import { COUNTRY_NAMES } from './countries';
import { MAX_LINE_QUANTITY } from './limits';

export { MAX_LINE_QUANTITY };

/** The one country priced as domestic. */
export const DOMESTIC_COUNTRY = 'Philippines';

/**
 * An allowlist, not free text: the country is a pricing input (domestic or
 * not), and one typo ("Philipines") must not silently reclassify an order.
 */
export const DELIVERABLE_COUNTRIES: readonly string[] = COUNTRY_NAMES;

/**
 * No delivery fee is priced into the total. Delivery fees and timing are
 * confirmed with the customer after payment is reconciled (see DELIVERY_NOTE),
 * and international freight is invoiced separately.
 */
export const SHIPPING_FEE_PESOS = 0;

export interface PricedLine {
  /** Whole pesos per unit. */
  price: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
  isDomestic: boolean;
}

function assertWholePositive(value: number, what: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${what} must be a positive whole number, got ${value}`);
  }
}

export function computeTotals(lines: PricedLine[], isDomestic: boolean): OrderTotals {
  let subtotal = 0;
  let itemCount = 0;
  for (const line of lines) {
    assertWholePositive(line.price, 'price');
    assertWholePositive(line.quantity, 'quantity');
    subtotal += line.price * line.quantity;
    itemCount += line.quantity;
  }
  const shipping = SHIPPING_FEE_PESOS;
  return { subtotal, shipping, total: subtotal + shipping, itemCount, isDomestic };
}
