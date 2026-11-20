import type { CartLine } from '@/lib/cart/resolve';
import { MAYA_ALLOWED_HOSTS } from '@/lib/payments/maya-hosts';
import type { CheckoutRequest, CheckoutResponse, OrderCustomer, ShippingAddress } from './types';

export class CheckoutClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CheckoutClientError';
  }
}

const UNSAFE_REDIRECT =
  'The payment link was not recognised, so we did not open it. Please try again or contact us.';

/** ids, pack ids, quantities and the link token ONLY: never a price, name or total. */
export function buildCheckoutPayload(args: {
  token: string;
  lines: CartLine[];
  customer: OrderCustomer;
  shippingAddress: ShippingAddress;
}): CheckoutRequest {
  return {
    token: args.token,
    items: args.lines.map((l) => ({ productId: l.productId, packId: l.packId, quantity: l.quantity })),
    customer: args.customer,
    shippingAddress: args.shippingAddress,
  };
}

/**
 * The last line of defence before the browser is sent to a payment page: even
 * a response that somehow carried the wrong host is refused. Uses the same
 * allowlist as the server's link builder, and is no weaker than it: https only,
 * no credentials, no explicit port.
 */
export function assertSafeRedirect(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CheckoutClientError(UNSAFE_REDIRECT);
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !MAYA_ALLOWED_HOSTS.has(url.hostname)
  ) {
    throw new CheckoutClientError(UNSAFE_REDIRECT);
  }
  return url.toString();
}

export async function submitCheckout(
  request: CheckoutRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<CheckoutResponse> {
  let res: Response;
  try {
    res = await fetchImpl('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new CheckoutClientError('We couldn’t reach the server. Check your connection and try again.');
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data as { error?: unknown } | null)?.error;
    throw new CheckoutClientError(
      typeof message === 'string' ? message : 'Something went wrong. Please try again.',
      res.status,
    );
  }

  const r = data as Partial<CheckoutResponse> | null;
  if (
    !r ||
    typeof r.reference !== 'string' ||
    typeof r.total !== 'number' ||
    typeof r.redirectUrl !== 'string' ||
    typeof r.persisted !== 'boolean'
  ) {
    throw new CheckoutClientError('The server sent an unexpected response. Nothing was charged.');
  }
  return { ...(r as CheckoutResponse), redirectUrl: assertSafeRedirect(r.redirectUrl) };
}
