'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ProductArt } from '@/components/art/ProductArt';
import type { InquiryProduct } from '@/lib/catalog/public';
import type { PackId } from '@/lib/catalog/types';
import { facetValueLabel } from '@/lib/shop/facets';
import { submitInquiry } from '@/lib/inquiry/client';
import { INQUIRY_LIMITS as L } from '@/lib/inquiry/types';

// Only price-free data reaches this form (InquiryProduct): a pack here is a label and a unit count, never an amount.

interface Line {
  key: string;
  productId: string;
  packId: PackId;
  /** A string draft so the field can be cleared and retyped; clamped on blur and on send. */
  quantity: string;
}

type FieldName = 'company' | 'contactName' | 'email';
type Errors = Partial<Record<FieldName | 'items', string>>;

const SEND_FALLBACK = 'We could not send your inquiry just now. Please try again in a moment.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clamp = (n: number) => Math.min(L.maxQuantity, Math.max(1, n));
/** An empty, zero or oversized draft becomes a whole number in 1..max. */
const toQuantity = (draft: string) => {
  const n = Number.parseInt(draft, 10);
  return Number.isFinite(n) ? clamp(n) : 1;
};

// border-ink-muted keeps the control edge visible on the chalk background; focus uses the global :focus-visible outline.
const field = 'field';
const labelClass = 'eyebrow block';
const OPTIONAL = <span className="font-normal text-ink-muted"> (optional)</span>;

interface Props {
  products: InquiryProduct[];
  initialSlug?: string;
  /** Text the note starts with (from the venue finder). */
  initialNote?: string;
}

export function InquiryForm({ products: allProducts, initialSlug, initialNote = '' }: Props) {
  // A model with no packs cannot be inquired about.
  const products = allProducts.filter((p) => p.packs.length > 0);
  const byId = new Map(products.map((p) => [p.id, p]));

  const keyCounter = useRef(0);
  const nextKey = () => `line-${(keyCounter.current += 1)}`;

  const [lines, setLines] = useState<Line[]>(() => {
    const start = initialSlug ? products.find((p) => p.slug === initialSlug) : undefined;
    return start ? [{ key: nextKey(), productId: start.id, packId: start.packs[0].id, quantity: '1' }] : [];
  });
  const [values, setValues] = useState({ company: '', contactName: '', email: '', phone: '', role: '', message: initialNote, website: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [pick, setPick] = useState('');

  const inFlight = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const sendErrorRef = useRef<HTMLParagraphElement>(null);
  const linesHeading = useRef<HTMLHeadingElement>(null);
  const thanksHeading = useRef<HTMLHeadingElement>(null);
  const focusNewLine = useRef<string | null>(null);
  const [summaryTick, setSummaryTick] = useState(0);
  const [errorTick, setErrorTick] = useState(0);

  useEffect(() => {
    if (summaryTick > 0) summaryRef.current?.focus();
  }, [summaryTick]);
  useEffect(() => {
    if (errorTick > 0) sendErrorRef.current?.focus();
  }, [errorTick]);
  useEffect(() => {
    if (status === 'sent') thanksHeading.current?.focus();
  }, [status]);
  useEffect(() => {
    const key = focusNewLine.current;
    if (!key) return;
    focusNewLine.current = null;
    document.getElementById(`pack-${key}`)?.focus();
  }, [lines]);

  const set = (name: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [name]: e.target.value }));

  const available = products.filter((p) => !lines.some((l) => l.productId === p.id));
  const picked = available.find((p) => p.id === pick) ?? available[0];
  const atCap = lines.length >= L.maxLines;

  function addLine() {
    if (!picked || atCap) return;
    const key = nextKey();
    focusNewLine.current = key;
    setLines((ls) => [...ls, { key, productId: picked.id, packId: picked.packs[0].id, quantity: '1' }]);
    setPick('');
  }

  function removeLine(key: string) {
    // The Remove button is about to disappear; park focus on the section heading so it never drops to <body>.
    linesHeading.current?.focus();
    setLines((ls) => ls.filter((l) => l.key !== key));
  }

  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function validate(): Errors {
    const next: Errors = {};
    if (!values.company.trim()) next.company = 'Enter your company or business name.';
    if (!values.contactName.trim()) next.contactName = 'Enter a contact name.';
    if (!values.email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'Enter a valid email address, like name@example.com.';
    if (lines.length === 0) next.items = 'Add at least one model to your inquiry.';
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // a double click must not send two inquiries
    if (status !== 'idle' || inFlight.current) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError(null);
      setSummaryTick((t) => t + 1);
      return;
    }
    inFlight.current = true;
    setStatus('sending');
    setError(null);
    try {
      const result = await submitInquiry({
        company: values.company.trim(),
        contactName: values.contactName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        role: values.role.trim(),
        message: values.message.trim(),
        items: lines.map((l) => ({ productId: l.productId, packId: l.packId, quantity: toQuantity(l.quantity) })),
        website: values.website,
      });
      if (result.ok) {
        setReference(result.reference);
        setStatus('sent');
      } else {
        // Everything the visitor typed stays in state, so they can fix and resend.
        setError(result.error);
        setErrorTick((t) => t + 1);
        setStatus('idle');
      }
    } catch {
      // submitInquiry reports failures as values; this only guards against it ever throwing.
      setError(SEND_FALLBACK);
      setErrorTick((t) => t + 1);
      setStatus('idle');
    } finally {
      inFlight.current = false;
    }
  }

  if (status === 'sent') {
    return (
      <div className="max-w-xl border border-ink bg-chalk-deep p-6" role="status">
        <p className="eyebrow">Inquiry saved</p>
        <h2 ref={thanksHeading} tabIndex={-1} className="mt-2 font-display text-4xl">Thank you</h2>
        <p className="mt-3 text-sm">We have received your inquiry.</p>
        <p className="mt-3 text-sm">
          Your reference is <strong className="readout font-semibold">{reference}</strong>. Keep it if you need to
          get in touch about this inquiry.
        </p>
        <div className="mt-5">
          <Link href="/shop" className="btn-primary">Back to the catalogue</Link>
        </div>
      </div>
    );
  }

  const messages = Object.entries(errors) as [FieldName | 'items', string][];
  const err = (name: FieldName | 'items') =>
    errors[name]
      ? ({ 'aria-invalid': true, 'aria-describedby': `${name}-error` } as const)
      : ({} as const);
  const fieldError = (name: FieldName | 'items') =>
    errors[name] ? <p id={`${name}-error`} className="mt-1 text-sm font-medium text-cobalt-dark">{errors[name]}</p> : null;

  const sending = status === 'sending';

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={sending} className="max-w-2xl space-y-10">
      {messages.length > 0 && (
        <div ref={summaryRef} role="alert" tabIndex={-1} className="border-2 border-cobalt-dark bg-chalk-deep p-4 text-sm">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {messages.map(([name, message]) => (
              <li key={name}><a href={name === 'items' ? '#add-model' : `#${name}`} className="underline">{message}</a></li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="inquiry-business" className="space-y-4">
        <h2 id="inquiry-business" className="border-b border-ink pb-2 font-display text-3xl">Your business</h2>
        <div>
          <label htmlFor="company" className={labelClass}>Company</label>
          <input id="company" name="company" autoComplete="organization" aria-required="true" maxLength={L.company}
            value={values.company} onChange={set('company')} className={field} {...err('company')} />
          {fieldError('company')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="contactName" className={labelClass}>Contact name</label>
            <input id="contactName" name="contactName" autoComplete="name" aria-required="true" maxLength={L.name}
              value={values.contactName} onChange={set('contactName')} className={field} {...err('contactName')} />
            {fieldError('contactName')}
          </div>
          <div className="min-w-0">
            <label htmlFor="email" className={labelClass}>Email</label>
            <input id="email" name="email" type="email" autoComplete="email" aria-required="true" maxLength={L.email}
              value={values.email} onChange={set('email')} className={field} {...err('email')} />
            {fieldError('email')}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="phone" className={labelClass}>Phone{OPTIONAL}</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={L.phone}
              value={values.phone} onChange={set('phone')} className={field} />
          </div>
          <div className="min-w-0">
            <label htmlFor="role" className={labelClass}>Your role{OPTIONAL}</label>
            <input id="role" name="role" autoComplete="organization-title" maxLength={L.role}
              value={values.role} onChange={set('role')} className={field} />
          </div>
        </div>
      </section>

      <section aria-labelledby="inquiry-models" className="space-y-4">
        <h2 id="inquiry-models" ref={linesHeading} tabIndex={-1} className="border-b border-ink pb-2 font-display text-3xl">Models you are interested in</h2>

        {lines.length === 0 ? (
          <p id="items-hint" className="text-sm text-ink-muted">Add a model below to start your inquiry.</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => {
              const product = byId.get(line.productId);
              if (!product) return null;
              const category = facetValueLabel('category', product.category) ?? product.category;
              return (
                <li key={line.key} className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border border-ink bg-white p-3 text-sm">
                  {/* The name is printed beside the drawing, so the drawing is decorative here. */}
                  <div className="faceplate h-[5.5rem] w-[5.5rem] shrink-0 border border-line p-2">
                    <ProductArt art={product.art} finishHex={product.finish.hex} className="h-full w-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words font-display text-xl leading-tight">{product.name}</p>
                    <p className="break-words font-mono text-xs uppercase tracking-wider text-ink-muted">{category} · {product.finish.name}</p>
                  </div>
                  <div className="col-span-2 flex min-w-0 flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1 basis-40">
                      <label htmlFor={`pack-${line.key}`} className={labelClass}>Pack<span className="sr-only"> for {product.name}</span></label>
                      <select id={`pack-${line.key}`} value={line.packId} onChange={(e) => patchLine(line.key, { packId: e.target.value as PackId })} className={field}>
                        {product.packs.map((pack) => (
                          <option key={pack.id} value={pack.id}>{pack.label}{pack.units > 1 ? ` · ${pack.units} units` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 min-w-0">
                      <label htmlFor={`qty-${line.key}`} className={labelClass}>Quantity<span className="sr-only"> for {product.name}</span></label>
                      <input
                        id={`qty-${line.key}`}
                        inputMode="numeric"
                        autoComplete="off"
                        value={line.quantity}
                        onChange={(e) => patchLine(line.key, { quantity: e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 4) })}
                        onBlur={() => patchLine(line.key, { quantity: String(toQuantity(line.quantity)) })}
                        className={field}
                      />
                    </div>
                    <button type="button" onClick={() => removeLine(line.key)} className="btn-outline min-w-0 px-4">
                      Remove{' '}<span className="sr-only">{product.name}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {fieldError('items')}
        <p id="packs-hint" className="text-sm text-ink-muted">
          Need the same model in more than one pack? Add the extra packs and quantities to your notes.
        </p>

        {available.length === 0 && lines.length > 0 && (
          <p className="text-sm text-ink-muted">All models added.</p>
        )}
        {available.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-56">
              <label htmlFor="add-model" className={labelClass}>Choose a model to add</label>
              <select id="add-model" value={picked?.id ?? ''} onChange={(e) => setPick(e.target.value)} disabled={atCap}
                aria-describedby={atCap ? 'cap-note' : undefined} className={field}>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.finish.name}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={addLine} disabled={atCap} aria-describedby={atCap ? 'cap-note' : undefined} className="btn-quiet">
              Add another model
            </button>
          </div>
        )}
        {atCap && (
          <p id="cap-note" className="text-sm text-ink-muted">You can add up to {L.maxLines} models to one inquiry.</p>
        )}
      </section>

      <section aria-labelledby="inquiry-notes" className="space-y-2">
        <h2 id="inquiry-notes" className="border-b border-ink pb-2 font-display text-3xl">Anything else</h2>
        <div>
          <label htmlFor="message" className={labelClass}>Notes{OPTIONAL}</label>
          <textarea id="message" name="message" rows={5} maxLength={L.message} aria-describedby="message-count"
            value={values.message} onChange={set('message')} className={`${field} py-2`} />
          <p id="message-count" className="readout mt-1 text-xs text-ink-muted">{`${values.message.length} / ${L.message}`}</p>
        </div>
      </section>

      {/* Honeypot: hidden from sight, keyboard and screen readers. A person never fills it; a bot often does. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          value={values.website} onChange={set('website')} />
      </div>

      {error && (
        <p ref={sendErrorRef} tabIndex={-1} role="alert" className="border-2 border-cobalt-dark bg-chalk-deep p-3 text-sm">{error}</p>
      )}

      <button type="submit" disabled={sending} className="btn-primary w-full sm:w-auto">
        {sending ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  );
}
