import 'server-only';

// What an order row means: "a payment link was issued for this basket at this
// total". NOTHING MORE. Maya Payment Links have no return redirect and no
// webhook, so this app is never told whether anyone paid. status is written
// 'pending' and only a human reconciling against the Maya dashboard may move
// it. No code path in this repository writes a paid status, deliberately.
//
// PERSISTENCE IS BEST-EFFORT AND MUST STAY THAT WAY. recordOrder never throws:
// the caller has already computed a total and built a link, both correct
// whether or not a row is written, and a logging failure must not refuse a sale.
// That includes serviceClient() itself throwing on a half-set configuration,
// which is why the call sits INSIDE the try block.

import { randomUUID } from 'node:crypto';
import type { OrderCustomer, ShippingAddress } from '@/lib/checkout/types';
import type { OrderTotals } from '@/lib/pricing';
import { serviceClient } from '@/lib/supabase/clients';
import { WriteTimeout, withTimeout } from './with-timeout';

export interface OrderLineInput {
  productId: string;
  /** SNAPSHOTTED: a later catalogue edit must not rewrite what was charged. */
  productName: string;
  packId: string;
  packLabel: string;
  /** Units in one pack (a pair is 2). */
  packUnits: number;
  /** The finish name at the time of the order. */
  finishName: string;
  /** Whole pesos for ONE PACK. */
  unitPrice: number;
  quantity: number;
}

export interface OrderInput {
  reference: string;
  totals: OrderTotals;
  paymentLink: string;
  customer: OrderCustomer;
  shippingAddress: ShippingAddress;
  lines: OrderLineInput[];
}

/** Why a write did not land. FIXED TOKENS only: raw database text never leaves this file. */
type Reason = 'no-service-key' | 'order-insert-failed' | 'items-insert-failed' | 'timeout' | 'exception';

const DEFAULT_TIMEOUT_MS = 3000;
/** The orphan cleanup may run past the overall deadline, but never for longer than this. */
const CLEANUP_CAP_MS = 500;

/** Logs the database error CODE only: never its message or details, which can echo row data. */
function logDbError(what: string, error: { code?: string } | null): void {
  console.error(`[checkout] ${what}`, { code: error?.code ?? 'unknown' });
}

/**
 * ONE overall deadline of `timeoutMs` covers the whole call (order insert +
 * items insert): each step gets only the time that remains, so a slow database
 * can never hold the customer for several budgets in a row. The orphan cleanup
 * is the one deliberate exception: it is attempted even when the deadline is
 * spent (a hung items insert is exactly when an orphan is most likely), but is
 * capped at CLEANUP_CAP_MS, so the worst case is timeoutMs + CLEANUP_CAP_MS.
 *
 * A TIMED-OUT WRITE IS NOT A CANCELLED WRITE. When the order insert times out we
 * stop waiting, but the request may still reach the database and land later,
 * leaving an order row with no lines and no cleanup (we never learn its outcome).
 * Items cascade-delete WITH their order, so there is never an item without an
 * order, but a lone order row can remain: reconcile from the Maya dashboard.
 */
export async function recordOrder(
  input: OrderInput,
  opts: { timeoutMs?: number } = {},
): Promise<{ persisted: boolean; reason?: Reason }> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  const remaining = () => Math.max(0, deadline - Date.now());
  try {
    const db = serviceClient();
    if (!db) return { persisted: false, reason: 'no-service-key' };

    const orderId = randomUUID();
    const order = await withTimeout(
      db.from('ja_orders').insert({
        id: orderId,
        reference: input.reference,
        status: 'pending',
        subtotal: input.totals.subtotal,
        shipping: input.totals.shipping,
        total: input.totals.total,
        item_count: input.totals.itemCount,
        is_domestic: input.totals.isDomestic,
        payment_link: input.paymentLink,
        customer: input.customer,
        shipping_address: input.shippingAddress,
      }),
      remaining(),
    );
    if (order.error) {
      logDbError('order insert failed', order.error);
      return { persisted: false, reason: 'order-insert-failed' };
    }

    let failure: Reason | null = null;
    try {
      const items = await withTimeout(
        db.from('ja_order_items').insert(
          input.lines.map((line) => ({
            order_id: orderId,
            product_id: line.productId,
            product_name: line.productName,
            pack_id: line.packId,
            pack_label: line.packLabel,
            pack_units: line.packUnits,
            finish_name: line.finishName,
            unit_price: line.unitPrice,
            quantity: line.quantity,
          })),
        ),
        remaining(),
      );
      if (items.error) {
        logDbError('order items insert failed', items.error);
        failure = 'items-insert-failed';
      }
    } catch (error) {
      // Timed out or threw: either way the order row exists and must be cleaned up.
      if (error instanceof WriteTimeout) {
        console.error('[checkout] order items insert timed out');
        failure = 'timeout';
      } else {
        console.error('[checkout] order items insert threw', error);
        failure = 'exception';
      }
    }

    if (failure) {
      // Do not leave an order with no lines behind. A failed cleanup is logged
      // (an orphan row needs a human) but never changes what the caller sees.
      try {
        const cleanup = await withTimeout(db.from('ja_orders').delete().eq('id', orderId), CLEANUP_CAP_MS);
        if (cleanup.error) logDbError('orphan order cleanup failed', cleanup.error);
      } catch {
        console.error('[checkout] orphan order cleanup timed out or threw');
      }
      return { persisted: false, reason: failure };
    }
    return { persisted: true };
  } catch (error) {
    if (error instanceof WriteTimeout) {
      console.error('[checkout] order insert timed out');
      return { persisted: false, reason: 'timeout' };
    }
    console.error('[checkout] order persistence threw', error);
    return { persisted: false, reason: 'exception' };
  }
}
