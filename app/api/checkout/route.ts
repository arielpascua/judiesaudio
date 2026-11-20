// POST /api/checkout
//
// THE ONE CHECKOUT'S API, REACHABLE ONLY WITH THE SECRET LINK TOKEN. The body
// carries the token from the page URL; without the configured token (or when no
// token is configured at all) this answers 404 {"error":"Not found"}, identical
// in both cases, so a scanner cannot tell a closed checkout from a wrong token.
//
// THE BROWSER SENDS IDS, PACK IDS AND QUANTITIES. IT DOES NOT SEND PRICES, and
// if it sends them anyway they are ignored: every peso below is computed here
// from this server's own catalogue (lib/catalog/fixtures.ts).
//
// WHAT THIS HONESTLY IS NOT: it does not take payment, and nothing comes back.
// A Maya Payment Link has no return redirect and no webhook, so the order is
// written 'pending' and a human reconciles it. See lib/payments/maya-link.ts.

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { fetchProductsByIds } from '@/lib/catalog/client';
import { isValidCheckoutToken } from '@/lib/checkout/link';
import { CheckoutError, parseAddress, parseCustomer, parseLines } from '@/lib/checkout/parse';
import { missingPersistenceVars } from '@/lib/checkout/persistence-config';
import { checkoutLimiter, clientIp } from '@/lib/checkout/rate-limit';
import { readBodyLimited } from '@/lib/checkout/read-body';
import type { CheckoutResponse } from '@/lib/checkout/types';
import {
  AmountTooLargeError,
  PaymentLinkConfigError,
  buildMayaPaymentLink,
  getMayaLinkConfig,
  isLiveMayaHost,
} from '@/lib/payments/maya-link';
import { DOMESTIC_COUNTRY, computeTotals } from '@/lib/pricing';
import { recordOrder } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

// One generic message for every infrastructure or configuration failure. The
// internal error (which can echo a URL, host or alias) goes to the server log
// only and never into a response.
const UNAVAILABLE = 'Checkout is temporarily unavailable. Please try again shortly.';

export async function POST(request: Request) {
  try {
    // Cheap rejections first. Requiring application/json also means a cross-site
    // HTML form cannot post here (it cannot set that content type without a
    // CORS preflight).
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      throw new CheckoutError('Content-Type must be application/json', 415);
    }
    if (!checkoutLimiter.allow(clientIp(request.headers))) {
      throw new CheckoutError('Too many requests. Please wait a moment and try again.', 429);
    }

    // Streamed with a running byte count (see read-body.ts): a chunked body with
    // no Content-Length is cut off at the limit rather than buffered whole.
    const text = await readBodyLimited(request, MAX_BODY_BYTES);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    // THE GATE. Checked before anything else in the body is read or validated.
    // A body that is not JSON, not an object or carries no token is "not found"
    // too: there is nothing to tell a scanner that a 400 would not give away.
    const token = (body as { token?: unknown } | null)?.token;
    if (!isValidCheckoutToken(token)) throw new CheckoutError('Not found', 404);

    // A LIVE Maya host must never issue a payment link unless the order can be
    // recorded: customer name and address are deliberately not logged, so a paid
    // order with nowhere to go would be lost. CONFIGURATION only: a runtime
    // database failure stays best-effort (persisted:false). Sandbox is unchanged.
    if (isLiveMayaHost(process.env)) {
      const missingVars = missingPersistenceVars(process.env);
      if (missingVars.length > 0) {
        throw new PaymentLinkConfigError(
          `a live Maya host requires order persistence; not configured: ${missingVars.join(', ')}`,
        );
      }
    }

    const requested = parseLines(body);
    const customer = parseCustomer(body);
    const shippingAddress = parseAddress(body);

    // ---- PRICES COME FROM HERE, NOT FROM THE REQUEST ----------------------
    const products = await fetchProductsByIds(requested.map((l) => l.productId));
    const byId = new Map(products.map((p) => [p.id, p]));

    const missing = requested.filter((l) => !byId.has(l.productId));
    if (missing.length > 0) {
      // Raw ids mean nothing to a customer (and a row that is gone has no name to show).
      const count = new Set(missing.map((l) => l.productId)).size;
      throw new CheckoutError(
        count === 1
          ? 'Your order includes an item that is no longer sold.'
          : `Your order includes ${count} items that are no longer sold.`,
        409,
      );
    }
    const soldOut = requested.filter((l) => !byId.get(l.productId)!.inStock);
    if (soldOut.length > 0) {
      throw new CheckoutError(
        `These items are out of stock: ${[...new Set(soldOut.map((l) => byId.get(l.productId)!.name))].join(', ')}`,
        409,
      );
    }

    const priced = requested.map((line) => {
      const product = byId.get(line.productId)!;
      const pack = product.packs.find((p) => p.id === line.packId);
      if (!pack) {
        throw new CheckoutError(`${product.name} is no longer offered in the pack you chose. Reload this page to refresh your order.`, 400);
      }
      return { product, pack, quantity: line.quantity };
    });

    const totals = computeTotals(
      priced.map((p) => ({ price: p.pack.price, quantity: p.quantity })),
      shippingAddress.country === DOMESTIC_COUNTRY,
    );

    // The order-line snapshot is built BEFORE the link, so a malformed catalogue
    // row fails here and can never throw after a payment link already exists.
    const lines = priced.map((p) => ({
      productId: p.product.id,
      productName: p.product.name,
      packId: p.pack.id,
      packLabel: p.pack.label,
      packUnits: p.pack.units,
      finishName: p.product.finish.name,
      unitPrice: p.pack.price,
      quantity: p.quantity,
    }));

    const redirectUrl = buildMayaPaymentLink(totals.total, getMayaLinkConfig(process.env));
    const reference = `JA-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

    // After the link is built, so a persistence failure can never prevent a sale.
    const record = await recordOrder({
      reference,
      totals,
      paymentLink: redirectUrl,
      customer,
      shippingAddress,
      lines,
    });

    // Customer name, email and address are deliberately NOT logged.
    console.info('[checkout] payment link issued', {
      reference,
      itemCount: totals.itemCount,
      total: totals.total,
      persisted: record.persisted,
      reason: record.reason,
    });

    const response: CheckoutResponse = {
      reference,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      itemCount: totals.itemCount,
      isDomestic: totals.isDomestic,
      redirectUrl,
      persisted: record.persisted,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          // Tells a well-behaved client when the fixed window reopens.
          headers: error.status === 429 ? { 'Retry-After': '60' } : undefined,
        },
      );
    }
    if (error instanceof AmountTooLargeError) {
      return NextResponse.json(
        { error: 'This order is too large to pay in one go. Please split it into smaller orders or contact us.' },
        { status: 422 },
      );
    }
    if (error instanceof PaymentLinkConfigError) {
      console.error('[checkout] payment link configuration is invalid', error);
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    if (error instanceof Error && error.name === 'SupabaseConfigError') {
      console.error('[checkout] database configuration unavailable', error);
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    console.error('[checkout] unexpected failure', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
