# Judie’s Audio

A B2B website for a commercial-audio supplier: speakers, subwoofers, column and ceiling speakers,
amplifiers, DSP and complete systems for restaurants, shops, hotels, churches, schools, offices, halls
and gyms.

It is a catalogue of **datasheets**, not a shop window. Buyers browse models, read a specification
table and a frequency-response graph, and send an inquiry. The public site shows no prices. A single
private checkout link exists for a customer the owner has agreed an order with.

Requires Node 20.19 or newer (20.19+, 22.13+ or 24+). The range is stated once in `package.json`
(`engines.node`) and a test keeps this line and the lockfile in step with it.

## Stack

Next.js 15 (App Router), React 19, Tailwind CSS 3, Zustand (the checkout basket), Supabase (inquiries
and orders, server side only), Vitest and Testing Library, Playwright (end to end, with axe).

Fonts: Instrument Serif (display), Schibsted Grotesk (body), IBM Plex Mono (readouts).

## Run it

    npm ci
    cp .env.example .env.local     # then fill in what you need; every variable is optional to browse
    npm run dev                    # http://localhost:3000

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm test` | Vitest (unit and component tests) |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright journeys, the no-price crawl and axe checks (builds, then serves on port 3100) |
| `npm run predeploy` | typecheck, lint, test and build, in that order |

## Environment variables

See `.env.example` for the full list with comments. In short:

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, robots |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE` | Contact lines. **Hidden when blank**; nothing is ever invented |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Saving inquiries and orders. Writes use the service-role key and never reach the browser |
| `INQUIRY_RATE_LIMIT_PER_MIN` | Inquiry submissions per IP per minute (default 5) |
| `CHECKOUT_LINK_TOKEN` | The secret in the private checkout link (below) |
| `CHECKOUT_RATE_LIMIT_PER_MIN` | Checkout requests per IP per minute |
| `MAYA_PAYMENT_LINK_BASE_URL`, `MAYA_MERCHANT_ALIAS` | The payment link provider. Blank base URL means sandbox |

## How the site works

- **Public pages** (`/`, `/shop`, `/shop/<facet>/<value>`, `/models/<slug>`, `/about`, `/help`,
  `/legal/*`, `/inquiry`, `/search`) never show a price, a peso sign or wording about paying. A source
  guard (`test/brand-guard.test.ts`) and an end-to-end crawl enforce it.
- **A model page** (`/models/<slug>`) is the datasheet: a schematic drawing, a mono specification
  table, a frequency-response graph drawn from the model’s −10 dB points, the venues it is listed for,
  install notes and an “Ask about this model” link to `/inquiry?product=<slug>`. A model that makes no
  sound (an amplifier or a processor) shows “Not applicable” instead of a curve.
- **Inquiries** (`/inquiry`, `POST /api/inquiry`) carry a company, a contact name, an email and a list of
  models with a pack and a quantity. An inquiry is reported as sent **only when its rows were saved**
  (tables `ja_inquiries` and `ja_inquiry_items`); otherwise the visitor gets an honest 503 and keeps what
  they typed. Contact details are never logged.
- **Old links**: `/product/<slug>` redirects (308) to `/inquiry?product=<slug>`; `/cart` is a 404.
- **Robots and sitemap** list the public pages. `/api/` and `/checkout/` are disallowed.

## The link-only checkout

There is exactly one checkout, at `/checkout/<CHECKOUT_LINK_TOKEN>`. It exists only for someone who
holds that link. Nothing public links to it (a test asserts it), it is `noindex`, it is not in the
sitemap, and `POST /api/checkout` answers 404 unless the request carries the same token.

- **Closed by default.** If `CHECKOUT_LINK_TOKEN` is unset, shorter than 24 characters or not URL-safe
  (`A-Z a-z 0-9 - _`), the page and the API both answer 404.
- **Generate a token** (32 URL-safe characters):

      node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"

  Put it in `CHECKOUT_LINK_TOKEN` on the server (never in git), then send the customer
  `https://<your-site>/checkout/<token>`.
- **Rotate or revoke** by changing the variable and redeploying: every old link stops working at once.
  Send the new link to whoever still needs it.
- **Prices are server-side only.** The request carries ids, pack ids and quantities; the catalogue in
  code is the only price authority.
- **Nothing marks an order paid.** The payment link has no webhook and no return redirect, so an order
  stays `pending` until a person reconciles it. No page claims otherwise.

## Editing the catalogue

The catalogue is code: `lib/catalog/fixtures.ts`. There is no catalogue database and no seed. Read it
only through `lib/catalog/client.ts`.

- A **product** is one model in one finish. Its only variant is the **pack** (single, pair, pack of 4,
  carton of 10); a pack carries the price in whole pesos for the whole pack.
- `specs` drive the datasheet. The frequency-response graph is drawn from `lowHz` and `highHz`; use
  `null` for a product that makes no sound.
- Public components accept `PublicProduct` (`lib/catalog/public.ts`), which has no price. Build it with
  `toPublicProduct`, `fetchPublicProducts` or `fetchPublicProductBySlug`.
- Model families are named in Filipino for what they do: Himig (melody), Dagundong (rumble), Haligi
  (pillar), Langit (sky), Ulan (rain), Lakas (strength) and Tipon (to gather).
- Every model, specification and price in the file is **launch seed data**. Replace each one with the
  real data before taking a real payment.

## Honesty rules

The site states no fact the owner has not supplied: no founding year, client name or count,
certification, award, warranty, delivery time, reply time, quote promise, address, phone number or
email. Contact details come from the two `NEXT_PUBLIC_CONTACT_*` variables and are hidden when blank.
Product drawings are schematics generated from each specification, not photographs, and the footer and
About page say so. The legal pages are a draft marked for the owner to review; they stay out of search
results until that notice is removed.

## Design: the datasheet

Chalk paper, hairline rules, monospace readouts, squared corners (never pills), cobalt as the signal
colour and amber only where a level meter would show a peak. Tokens are in `lib/design/tokens.ts` and
`tailwind.config.ts`; primitives (`.btn-*`, `.eyebrow`, `.field`, `.chip`, `.faceplate`, `.tick-rule`,
`.led-bar`, `.trace-draw`, `.spec-table`) are in `app/globals.css`. Motion honours
`prefers-reduced-motion`.

## Database migrations

Run these in the Supabase SQL editor, in order. Both are idempotent.

1. `db/migrations/0001_ja_orders.sql`: the orders tables.
2. `db/migrations/0002_ja_inquiries.sql`: `ja_inquiries` and `ja_inquiry_items`. Row-level security is on
   with **no** policies for the anon or authenticated roles, so only the server’s service-role key can
   read or write them. An inquiry row stores a pack label and a unit count, never a price.

## Before shipping

    npm run typecheck && npm run lint && npm test && npm run build
