// POST /api/inquiry
//
// A business inquiry: which models, in which packs and quantities, and who to
// write back to. THERE IS NO PRICE ANYWHERE IN THIS FLOW: the request is never
// asked for one, a price sent anyway is never read, and nothing here returns one.
//
// SUCCESS MEANS THE ROWS WERE SAVED. Unlike checkout there is no payment link to
// protect, so a failed write is an honest 503 and the visitor keeps what they typed.
// NOTHING IN THIS FILE LOGS CONTACT DATA (R-IQ-9): the log carries a reference and a count.

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { fetchProductsByIds } from '@/lib/catalog/client';
import { CheckoutError } from '@/lib/checkout/parse';
import { clientIp } from '@/lib/checkout/rate-limit';
import { readBodyLimited } from '@/lib/checkout/read-body';
import { parseInquiry } from '@/lib/inquiry/parse';
import { inquiryLimiter } from '@/lib/inquiry/rate-limit';
import type { InquiryResponse } from '@/lib/inquiry/types';
import { InquiryUnavailableError, recordInquiry } from '@/lib/server/inquiries';
import { SupabaseConfigError } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

// One generic message for every infrastructure or configuration failure. The
// internal error goes to the server log only and never into a response.
const UNAVAILABLE = 'We could not send your inquiry just now. Please try again in a moment.';

export async function POST(request: Request) {
  try {
    // Cheap rejections first, in the same order as /api/checkout.
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      throw new CheckoutError('Content-Type must be application/json', 415);
    }
    if (!inquiryLimiter.allow(clientIp(request.headers))) {
      throw new CheckoutError('Too many requests. Please wait a moment and try again.', 429);
    }

    const text = await readBodyLimited(request, MAX_BODY_BYTES);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new CheckoutError('Request body must be valid JSON', 400);
    }
    const inquiry = parseInquiry(body);

    // The catalogue, not the browser, decides what exists and what it is called.
    const products = await fetchProductsByIds(inquiry.lines.map((l) => l.productId));
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = inquiry.lines.map((line) => {
      const product = byId.get(line.productId);
      if (!product) {
        throw new CheckoutError(
          'One of the models you chose is no longer listed. Please reload the page and try again.',
          400,
        );
      }
      const pack = product.packs.find((p) => p.id === line.packId);
      if (!pack) {
        throw new CheckoutError(`${product.name} is no longer offered in the pack you chose. Please reload the page.`, 400);
      }
      // A snapshot, deliberately WITHOUT a price. An out-of-stock model is accepted: an inquiry may ask about it.
      return {
        productId: product.id,
        productName: product.name,
        packId: pack.id,
        packLabel: pack.label,
        units: pack.units,
        quantity: line.quantity,
      };
    });

    const reference = `JAI-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    await recordInquiry({
      reference,
      company: inquiry.company,
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
      role: inquiry.role,
      message: inquiry.message,
      lines,
    });

    console.info('[inquiry] received', { reference, lines: lines.length });
    const response: InquiryResponse = { reference };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: error.status === 429 ? { 'Retry-After': '60' } : undefined,
        },
      );
    }
    if (error instanceof InquiryUnavailableError || error instanceof SupabaseConfigError) {
      // These errors carry no row data by construction (fixed messages only).
      console.error('[inquiry] unavailable', error);
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    // Name only: an unknown error's message could echo anything, including what was submitted.
    console.error('[inquiry] unexpected failure', { name: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
