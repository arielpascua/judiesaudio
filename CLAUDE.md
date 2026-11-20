# Judie's Audio: working rules

Judie's Audio is a B2B supplier of commercial audio: speakers, subwoofers, column and ceiling
speakers, amplifiers, DSP and complete systems for restaurants, retail, hotels, churches, schools,
offices, venues and gyms. **It will take real customer payments.** The site was copied from the
Taruuv rug store; nothing of Taruuv's (brand, copy, merchants, phone number, invoice area, images)
may remain.

## Honesty rules (no invented facts)

- Never write a founding year, a client name or count, a certification, an award, a warranty term, a
  delivery time, a reply time, a quote promise, a showroom/branch/address, a phone number or an email
  that the owner has not supplied. Contact details come from `NEXT_PUBLIC_CONTACT_EMAIL` /
  `NEXT_PUBLIC_CONTACT_PHONE` and are hidden when unset (`lib/site.ts`).
- Every model, specification and price in `lib/catalog/fixtures.ts` is launch seed data the owner must
  replace before a real payment.
- Product drawings are schematics generated from the specification (`components/art/ProductArt.tsx`),
  not photographs, and the site says so (`IMAGE_DISCLOSURE`).

## Catalogue

- **The catalogue is code**: `lib/catalog/fixtures.ts`. There is no catalogue database and no seed.
  Read it through `lib/catalog/client.ts` only.
- A `Product` is one model in one finish. The only variant is the **pack** (single, pair, pack of 4,
  carton of 10), and a pack carries the price (whole pesos for the whole pack). Prices exist only on
  `Product.packs[].price`.
- `Specs` drive the datasheet. The frequency-response curve is drawn from `lowHz`/`highHz`; never
  decorative numbers.
- **`PublicProduct` (`lib/catalog/public.ts`) is the only product type public components accept.** It
  has no price. Build it with `toPublicProduct`, `fetchPublicProducts` or `fetchPublicProductBySlug`.

## B2B site (no public prices)

- **Public pages show no prices (R-B2B-1)**: no peso amount, price filter, price sort or `offers`
  JSON-LD, and no wording about paying. A source guard in `test/brand-guard.test.ts` and an e2e crawl
  enforce it. Only `/checkout/*` and `/api/checkout` are exempt.
- Buyers send an inquiry (`/inquiry`, `POST /api/inquiry`). An inquiry is reported as sent **only when
  its rows were saved**; a failed save is an honest 503. Never log contact details.
- `/product/<slug>` redirects (308) to `/inquiry?product=<slug>`; `/cart` is 404.
- **Copy rules:** no promise of a reply time or a quote, and no price, on any public page.

## The one checkout (link only)

- There is **exactly one checkout**: `/checkout/<CHECKOUT_LINK_TOKEN>`. It exists only for someone who
  holds the link. `lib/checkout/link.ts` is the gate: an unset, short (<24) or non-URL-safe token
  means checkout is **closed** (404 on page and API). Changing the variable kills every old link.
- The page 404s on a wrong token, and `POST /api/checkout` requires the same token in the body and
  answers 404 without it. Nothing public links to it (a test asserts it), it is `noindex`, and it is
  absent from the sitemap (robots only disallows the bare `/checkout/` prefix, which reveals no token).
- **Prices are server-side only.** The request carries ids, pack ids and quantities.
  `lib/catalog/fixtures.ts` is the only price authority.
- Payment is a Maya Payment Link (`lib/payments/maya-link.ts`): ONE merchant alias,
  `MAYA_MERCHANT_ALIAS`. A blank `MAYA_PAYMENT_LINK_BASE_URL` means SANDBOX; a live host never falls back
  to the sandbox alias; blank base URL plus a configured alias throws. Do not "fix" a thrown error by
  adding a fallback.
- **Nothing marks an order paid.** Maya Payment Links have no webhook and no return redirect.
  `ja_orders.status` stays `pending` until a human reconciles it. Never write code or UI copy that
  claims otherwise.
- On a live Maya host checkout refuses (503) unless the Supabase URL, anon key and service-role key
  are all set. Runtime database failures stay best-effort (`persisted: true|false`, and the UI says so).

## Design language: the datasheet

Chalk paper, hairline rules, monospace readouts, squared corners (never pills), cobalt as the signal
colour, amber only where a level meter would show a peak. Tokens live in `lib/design/tokens.ts` and
`tailwind.config.ts`; primitives (`.btn-*`, `.eyebrow`, `.faceplate`, `.tick-rule`, `.meter-bar`,
`.trace-draw`) live in `app/globals.css`. Fonts: Instrument Serif (display), Schibsted Grotesk
(body), IBM Plex Mono (readouts). Honour `prefers-reduced-motion`.

## Before shipping

    npm run typecheck && npm run lint && npm test && npm run build

## Git

Work on `main`. Do not create branches.
