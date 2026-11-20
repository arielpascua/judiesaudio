'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useCartUi } from '@/components/cart/CartProvider';
import { toLookupIndex, type CatalogueIndex } from '@/lib/catalog';
import { resolveCart } from '@/lib/cart/resolve';
import { useCartStore } from '@/lib/cart/store';
import {
  CheckoutClientError,
  assertSafeRedirect,
  buildCheckoutPayload,
  submitCheckout,
} from '@/lib/checkout/client';
import { clearLastOrder, loadLastOrder, saveLastOrder, type LastOrder } from '@/lib/checkout/last-order';
import { FIELD_LIMITS } from '@/lib/checkout/limits';
import type { CheckoutResponse } from '@/lib/checkout/types';
import { formatPeso } from '@/lib/format';
import { DELIVERABLE_COUNTRIES, DOMESTIC_COUNTRY } from '@/lib/pricing';
import { CONTACT_EMAIL, CONTACT_PHONE, formatPhone } from '@/lib/site';
import { Field, fieldClass, labelClass } from './Field';
import { OrderLines } from './OrderLines';
import { OrderSummary, type SubmitStatus } from './OrderSummary';
import { PendingBanner } from './PendingBanner';
import { ProductPicker } from './ProductPicker';

interface Props {
  /** The secret link token from the URL, sent back to the API as proof that the buyer holds the link. */
  token: string;
  /**
   * EVERY product (in and out of stock), from the server catalogue. A plain
   * object when it arrives from the server; converted to a null-prototype
   * lookup here before any use.
   */
  index: CatalogueIndex;
  navigate?: (url: string) => void;
  submit?: typeof submitCheckout;
  /** Reloads the page so the order is re-read from the live catalogue. Injected so tests need not touch location. */
  reload?: () => void;
}

const sectionHeading = 'font-display text-2xl';

export function CheckoutClient({
  token,
  index: plainIndex,
  navigate = (url) => window.location.assign(url),
  submit = submitCheckout,
  reload = () => window.location.reload(),
}: Props) {
  const { hydrated } = useCartUi();
  const index = useMemo(() => toLookupIndex(plainIndex), [plainIndex]);
  const lines = useCartStore((s) => s.lines);
  const removeMany = useCartStore((s) => s.removeMany);

  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<{
    response: CheckoutResponse;
    /** We could not confirm the order was saved on our side. */
    unsaved: boolean;
    /** The server's goods subtotal is not the one the customer was shown. */
    priceChanged: boolean;
    /** The server's subtotal matches but its total is higher: a delivery fee the button never showed (0 = none). */
    deliveryAdded: number;
  } | null>(null);
  const [country, setCountry] = useState(DOMESTIC_COUNTRY);
  const [last, setLast] = useState<LastOrder | null>(null);
  const inFlight = useRef(false);
  const heldHeading = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLast(loadLastOrder()), []);

  // A Back / bfcache restore can bring this page back exactly as it was left,
  // with Pay stuck on "Taking you to Maya…". That restore fires a pageshow with
  // `persisted` set, which resets the form and re-reads the remembered order so
  // the pending note is shown. (Pressing Stop mid-navigation fires no pageshow;
  // the page then stays as it is and a reload is the way out.)
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setStatus('idle');
      setHeld(null);
      setLast(loadLastOrder());
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // The form unmounts when the held panel appears; move focus to its heading so
  // keyboard and screen-reader users land on the message.
  useEffect(() => {
    if (status === 'held') heldHeading.current?.focus();
  }, [status]);

  // A failed submit puts focus on the error, which is also announced (role="alert").
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const cart = useMemo(() => resolveCart(lines, index), [lines, index]);

  const canPay = hydrated && cart.lines.length > 0 && status === 'idle';
  const isDomestic = country === DOMESTIC_COUNTRY;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // a double click must not create two orders
    if (status !== 'idle' || inFlight.current || !hydrated || cart.lines.length === 0) return;
    inFlight.current = true;
    setStatus('submitting');
    setError(null);

    const data = new FormData(event.currentTarget);
    const text = (k: string) => String(data.get(k) ?? '').trim();
    const request = buildCheckoutPayload({
      token,
      lines: cart.lines.map((l) => l.line),
      customer: {
        company: text('company'),
        contactName: text('contactName'),
        email: text('email'),
        phone: text('phone') || undefined,
        taxId: text('taxId') || undefined,
        poReference: text('poReference') || undefined,
      },
      shippingAddress: {
        line1: text('line1'),
        line2: text('line2') || undefined,
        barangay: text('barangay') || undefined,
        city: text('city'),
        province: text('province'),
        postalCode: text('postalCode'),
        country: text('country'),
      },
    });

    try {
      const response = await submit(request);
      const url = assertSafeRedirect(response.redirectUrl);
      // The server's amount is authoritative: if it is not what we displayed,
      // the customer must see that before they are sent to pay it.
      // Maya is asked for response.total, and the button shows cart.subtotal, so
      // BOTH must match before anyone is sent on without reading anything:
      //  - subtotal differs: the goods price moved;
      //  - only the total differs: a delivery fee the button never showed.
      // Either way the customer reads it first and continues on purpose.
      const priceChanged = response.subtotal !== cart.subtotal;
      const deliveryAdded = !priceChanged && response.total !== cart.subtotal ? response.total - response.subtotal : 0;
      if (response.persisted && !priceChanged && response.total === cart.subtotal) {
        const order: LastOrder = { reference: response.reference, total: response.total, at: Date.now() };
        saveLastOrder(order);
        setLast(order);
        setStatus('redirecting');
        navigate(url);
      } else {
        // Do not whisk the customer away before they can read this. They
        // continue on purpose; the order is remembered only when they do.
        setHeld({ response: { ...response, redirectUrl: url }, unsaved: !response.persisted, priceChanged, deliveryAdded });
        setStatus('held');
      }
    } catch (e) {
      if (e instanceof CheckoutClientError) {
        // 409 = the catalogue moved under this page (sold out, withdrawn): what is
        // on screen is stale, so tell the customer how to get a fresh order.
        const message = /[.!?]$/.test(e.message) ? e.message : `${e.message}.`;
        setError(e.status === 409 ? `${message} Reload this page to refresh your order.` : e.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setStatus('idle');
    } finally {
      inFlight.current = false;
    }
  }

  if (status === 'held' && held) {
    const { response } = held;
    const continueToMaya = () => {
      const order: LastOrder = { reference: response.reference, total: response.total, at: Date.now() };
      saveLastOrder(order);
      setLast(order);
      navigate(response.redirectUrl);
    };
    return (
      <div className="max-w-xl border border-ink border-l-4 border-l-cobalt bg-chalk-deep p-6" role="status">
        <p className="eyebrow">Order {response.reference} · pending</p>
        <h2 ref={heldHeading} tabIndex={-1} className="mt-1 font-display text-2xl">One thing before you go to Maya</h2>
        {held.priceChanged && (
          <p className="mt-3 text-sm">
            The price changed while you were checking out. The new total is {formatPeso(response.total)}.
          </p>
        )}
        {held.deliveryAdded > 0 && (
          <p className="mt-3 text-sm">
            Delivery of {formatPeso(held.deliveryAdded)} is added, so you&apos;ll pay {formatPeso(response.total)} on Maya.
          </p>
        )}
        {held.unsaved && (
          <p className="mt-3 text-sm">
            We couldn’t confirm that order {response.reference} was saved in our system. You can still pay, but
            please keep your Maya receipt and this reference number
            {CONTACT_EMAIL ? `, and email us at ${CONTACT_EMAIL}` : ''} so we can match your payment to your order.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={continueToMaya} className="btn-primary">
            Continue to Maya
          </button>
          {(held.priceChanged || held.deliveryAdded > 0) && (
            // Quiet on purpose: the primary action stays "continue". This is the way out for a customer who wants to re-read the order.
            <button type="button" onClick={reload} className="btn-quiet">
              Review my order
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {last && (
        <PendingBanner
          order={last}
          onDismiss={() => {
            clearLastOrder();
            setLast(null);
          }}
          onClearItems={() => {
            removeMany(lines.map((l) => ({ productId: l.productId, packId: l.packId })));
            clearLastOrder();
            setLast(null);
          }}
        />
      )}

      <form onSubmit={onSubmit} aria-label="Purchase order" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-12">
          <OrderLines index={index} cart={cart} hydrated={hydrated} />

          <ProductPicker index={index} />

          <section aria-labelledby="buyer">
            <div className="border-b border-ink pb-2">
              <h2 id="buyer" className={sectionHeading}>Buyer</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="company" label="Company" autoComplete="organization" maxLength={FIELD_LIMITS.company} />
              </div>
              <Field id="contactName" label="Contact name" autoComplete="name" maxLength={FIELD_LIMITS.name} />
              <Field id="email" label="Email" type="email" autoComplete="email" maxLength={FIELD_LIMITS.email} />
              <Field id="phone" label="Phone" optional type="tel" autoComplete="tel" maxLength={FIELD_LIMITS.phone} />
              <Field id="taxId" label="Tax ID (TIN)" optional maxLength={FIELD_LIMITS.taxId} autoComplete="off" />
              <div className="sm:col-span-2">
                <Field
                  id="poReference"
                  label="Your PO reference"
                  optional
                  maxLength={FIELD_LIMITS.poReference}
                  autoComplete="off"
                  hint="Your own purchase-order number, if you use one. It is kept with the order."
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="delivery">
            <div className="border-b border-ink pb-2">
              <h2 id="delivery" className={sectionHeading}>Delivery address</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="line1" label="Street address" autoComplete="address-line1" maxLength={FIELD_LIMITS.line} />
              </div>
              <div className="sm:col-span-2">
                <Field id="line2" label="Address line 2" optional autoComplete="address-line2" maxLength={FIELD_LIMITS.line} />
              </div>
              <Field id="barangay" label="Barangay" optional autoComplete="address-level3" maxLength={FIELD_LIMITS.barangay} />
              <Field id="city" label="City or municipality" autoComplete="address-level2" maxLength={FIELD_LIMITS.city} />
              <Field
                id="province"
                label={isDomestic ? 'Province' : 'State or region'}
                optional={!isDomestic}
                autoComplete="address-level1"
                maxLength={FIELD_LIMITS.province}
              />
              <Field id="postalCode" label="Postal code" autoComplete="postal-code" maxLength={FIELD_LIMITS.postal} />
              <div className="sm:col-span-2">
                <label htmlFor="country" className={labelClass}>Country</label>
                <select id="country" name="country" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} className={fieldClass}>
                  {DELIVERABLE_COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                {!isDomestic && (
                  <p className="mt-2 text-xs text-ink-muted">International freight is not in this total.</p>
                )}
              </div>
            </div>
          </section>

          {(CONTACT_EMAIL || CONTACT_PHONE) && (
            <p className="text-sm text-ink-muted">
              Questions about your order?{' '}
              {CONTACT_PHONE && (
                <>
                  Call <a className="underline" href={`tel:${CONTACT_PHONE}`}>{formatPhone(CONTACT_PHONE)}</a>
                  {CONTACT_EMAIL ? ' or email ' : ''}
                </>
              )}
              {CONTACT_EMAIL && (
                <>
                  {CONTACT_PHONE ? '' : 'Email '}
                  <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                </>
              )}
              .
            </p>
          )}
        </div>

        <OrderSummary cart={cart} status={status} canPay={canPay} isDomestic={isDomestic} error={error} errorRef={errorRef} />
      </form>
    </div>
  );
}
