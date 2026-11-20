import type { CSSProperties, Ref } from 'react';
import type { ResolvedCart } from '@/lib/cart/resolve';
import { COLOURS } from '@/lib/design/tokens';
import { formatPeso } from '@/lib/format';

export type SubmitStatus = 'idle' | 'submitting' | 'redirecting' | 'held';

interface Props {
  cart: ResolvedCart;
  status: SubmitStatus;
  canPay: boolean;
  isDomestic: boolean;
  error: string | null;
  errorRef: Ref<HTMLDivElement>;
}

/**
 * The summary rail: a graphite faceplate with the order total as a peak
 * readout. Prices ARE shown here (this page is exempt from the no-prices rule).
 * It never says an order is paid or confirmed: a Maya payment link carries
 * only an amount, and a person matches the payment to the order.
 */
export function OrderSummary({ cart, status, canPay, isDomestic, error, errorRef }: Props) {
  const hasLines = cart.lines.length > 0;
  return (
    <aside aria-labelledby="order-summary" className="lg:sticky lg:top-24 lg:self-start">
      <div className="faceplate on-dark p-6 pt-8 text-chalk" style={{ '--faceplate-bg': COLOURS.graphite } as CSSProperties}>
        <p className="eyebrow">Purchase order</p>
        <h2 id="order-summary" className="mt-1 font-display text-2xl">
          Order summary
        </h2>

        <dl className="readout mt-5 space-y-2 border-t border-chalk/25 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-chalk/70">Packs</dt>
            <dd>{cart.itemCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-chalk/70">Units</dt>
            <dd>{cart.unitCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-chalk/70">Subtotal</dt>
            <dd>{formatPeso(cart.subtotal)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-chalk/25 pt-4">
          <p className="eyebrow">Total to pay</p>
          <p className="readout mt-1 text-3xl font-medium text-amber" aria-label={`Total ${formatPeso(cart.subtotal)}`}>
            {formatPeso(cart.subtotal)}
          </p>
          <p className="mt-2 text-xs text-chalk/70">
            {isDomestic ? 'Delivery is not included in this total.' : 'International freight is not included in this total.'}
          </p>
        </div>

        {/* Mounted even when empty so focus can be sent here; it becomes an alert (announced) only when there is something to say. */}
        <div ref={errorRef} tabIndex={-1} role={error ? 'alert' : undefined} className={error ? 'mt-4 border border-amber bg-ink p-3 text-sm' : undefined}>
          {error}
        </div>

        <button type="submit" disabled={!canPay} className="btn-signal mt-5 w-full">
          {status === 'submitting'
            ? 'Preparing your payment…'
            : status === 'redirecting'
              ? 'Taking you to Maya…'
              : hasLines
                ? `Pay ${formatPeso(cart.subtotal)} with Maya`
                : 'Add a product to pay'}
        </button>

        <p className="mt-4 text-xs leading-relaxed text-chalk/70">
          You pay on Maya’s own page, through a payment link for the total above. Maya doesn’t tell us when a payment
          is made, so this order stays <strong className="font-semibold text-chalk">pending</strong> until our team
          matches your payment to it. Keep your Maya receipt and your order reference.
        </p>
      </div>
    </aside>
  );
}
