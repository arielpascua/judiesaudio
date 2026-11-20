import { formatPeso } from '@/lib/format';
import type { LastOrder } from '@/lib/checkout/last-order';

// Never says an order was completed: this app cannot know. Maya sends nothing back.
// And it never says the order was "sent" to Maya: Maya receives only an amount in
// the link, not the order, so the wording says where the CUSTOMER was taken.
export function PendingBanner({
  order,
  onDismiss,
  onClearItems,
}: {
  order: LastOrder;
  onDismiss: () => void;
  onClearItems: () => void;
}) {
  return (
    <div className="border border-ink border-l-4 border-l-cobalt bg-chalk-deep p-4 text-sm" role="status">
      <p className="eyebrow">Order {order.reference} · pending</p>
      <p className="mt-2 font-semibold">
        You were taken to Maya to pay for order {order.reference} ({formatPeso(order.total)}) on{' '}
        {new Date(order.at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}.
      </p>
      <p className="mt-2 text-ink-muted">
        Maya doesn’t tell us what happens on its page, so we can’t see whether it was completed. Keep your Maya
        receipt and this reference. If you didn’t finish, you can start again below, which creates a new order.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4">
        <button type="button" onClick={onClearItems} className="inline-flex min-h-[44px] items-center underline">Remove these items from my order</button>
        <button type="button" onClick={onDismiss} className="inline-flex min-h-[44px] items-center underline">Dismiss</button>
      </div>
    </div>
  );
}
