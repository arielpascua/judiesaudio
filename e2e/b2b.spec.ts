import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../lib/catalog/fixtures';
import { DEV_CHECKOUT_TOKEN } from './support';

// The standing R-B2B-1 crawl: the PUBLIC site shows no price and never mentions paying.
// It fetches the real server-rendered HTML (no browser, no JS), which is exactly what a
// crawler, a curl, or "view source" sees, including the RSC payload inside the <script> tags.
//
// /checkout/<token> is the one deliberate exemption: it is asserted below to be closed to a
// wrong token, live and noindex for the right one, and linked from nowhere.

const SLUG = PRODUCTS[0].slug;
const WORSHIP_AND_COLUMNS = '/shop?application=worship&category=column-array';

const PUBLIC_PATHS = [
  '/',
  '/shop',
  '/shop/category/ceiling',
  '/shop/application/worship',
  WORSHIP_AND_COLUMNS,
  '/shop?minPrice=1&sort=price-asc',
  '/search?q=himig',
  '/about',
  '/help',
  '/legal/terms',
  '/legal/privacy',
  '/inquiry',
  `/inquiry?product=${SLUG}`,
  '/inquiry?venue=retail&area=50-150',
  ...PRODUCTS.map((p) => `/models/${p.slug}`),
];

/**
 * Words that must not be visible on a public page.
 */
const FORBIDDEN_WORDS: Array<[string, RegExp]> = [
  ['price', /\bpric(e|es|ed|ing)\b/i],
  ['peso', /\bpesos?\b/i],
  ['maya', /\bmaya\b/i],
  ['pay', /\bpay(s|ing|ment|ments)?\b/i],
  ['paid', /\bpaid\b/i],
  ['offer', /\boffers\b/i],
];

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&nbsp;': ' ' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|nbsp|#x27|#39);/g, (m) => ENTITIES[m] ?? m);

/** Visible text: scripts, styles and comments dropped, then tags dropped. */
function visibleText(html: string): string {
  return decode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

/** Text that is not "visible" but is read: alt, aria-label, title, placeholder and meta content. */
function attributeText(html: string): string {
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  const out: string[] = [];
  for (const m of withoutScripts.matchAll(/\s(?:alt|aria-label|title|placeholder|content)="([^"]*)"/gi)) out.push(decode(m[1]));
  return out.join('\n');
}

/**
 * A crawl that reads an empty or error body would pass every "absent" check without proving anything.
 * Real content means an <h1> and a body of visible text well above an error page.
 */
const MIN_VISIBLE_CHARS = 200;
function assertRealContent(html: string, label: string) {
  if (!/<h1[\s>]/i.test(html)) throw new Error(`${label}: no <h1> in the response, so the crawl would prove nothing`);
  const length = visibleText(html).replace(/\s+/g, ' ').trim().length;
  if (length < MIN_VISIBLE_CHARS) {
    throw new Error(`${label}: only ${length} visible characters (floor ${MIN_VISIBLE_CHARS}), so the crawl would prove nothing`);
  }
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/gi)].map((m) => decode(m[1]));
}

for (const path of PUBLIC_PATHS) {
  test(`R-B2B-1: ${path} shows no price, no payment wording and no checkout link`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    const html = await res.text();
    assertRealContent(html, path);

    // (1) no peso sign anywhere in the document, scripts included.
    expect(html, `${path}: peso sign`).not.toContain('₱');

    // (2) no forbidden wording in the visible text or in the attributes that are read aloud.
    const text = visibleText(html);
    const attrs = attributeText(html);
    for (const [name, pattern] of FORBIDDEN_WORDS) {
      expect(text.match(pattern)?.[0] ?? null, `${path}: visible "${name}" wording`).toBeNull();
      expect(attrs.match(pattern)?.[0] ?? null, `${path}: attribute "${name}" wording`).toBeNull();
    }

    // (3) the RSC payload and any JSON-LD carry no price key, however deeply escaped.
    // Next names the page segment after the request's own query string ("__PAGE__?{"minPrice":"1",...}"):
    // that is the visitor's URL echoed back, not catalogue data, so it is removed before the broad scan.
    const withoutQueryEcho = html.replace(/__PAGE__\?\{[^}]*\}/g, '__PAGE__');
    expect(
      withoutQueryEcho.match(/\\*"[A-Za-z_]*[Pp]rice[A-Za-z_]*\\*"\s*:/)?.[0] ?? null,
      `${path}: a price key in the payload`,
    ).toBeNull();
    expect(html, `${path}: "price" key`).not.toContain('"price"');
    expect(html, `${path}: escaped "price" key`).not.toContain('\\"price\\"');
    expect(html.match(/\\*"offers\\*"\s*:/)?.[0] ?? null, `${path}: "offers" key`).toBeNull();

    // (4) nothing links to a checkout or a cart, in markup or in the payload.
    const bad = hrefs(html).filter((h) => /\/(checkout|cart)(\/|\?|#|$)/i.test(h));
    expect(bad, `${path}: links to checkout/cart`).toEqual([]);
    expect(html.match(/href\\*"\s*:\s*\\*"\/(checkout|cart)/)?.[0] ?? null, `${path}: checkout/cart href in the payload`).toBeNull();

    // (5) nothing of the old store.
    expect(text.match(/taruuv|\brugs?\b|carpet/i)?.[0] ?? null, `${path}: rug-store wording`).toBeNull();
  });
}

test('R-B2B-1: a model page carries Product JSON-LD with no offers', async ({ request }) => {
  const html = await (await request.get(`/models/${SLUG}`)).text();
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  expect(ld).toHaveLength(1);
  expect(ld[0]['@type']).toBe('Product');
  expect(ld[0]).not.toHaveProperty('offers');
});

test('R-B2B-1: the search page for a no-result query is also price-free', async ({ request }) => {
  const res = await request.get('/search?q=zzzz-no-such-model');
  expect(res.status()).toBe(200);
  const html = await res.text();
  assertRealContent(html, '/search?q=zzzz-no-such-model');
  expect(html).not.toContain('₱');
  for (const [name, pattern] of FORBIDDEN_WORDS) expect(visibleText(html).match(pattern)?.[0] ?? null, name).toBeNull();
});

test('the /inquiry document carries only what the form shows: no description, applications or specs', async ({ request }) => {
  const res = await request.get(`/inquiry?product=${SLUG}`);
  expect(res.status()).toBe(200);
  const html = await res.text();
  assertRealContent(html, '/inquiry');
  // The form is a client component, so every prop is page payload: check the JSON keys, however escaped.
  for (const key of ['description', 'shortDescription', 'applications', 'specs', 'install', 'inStock']) {
    expect(html.match(new RegExp(String.raw`\\*"${key}\\*"\s*:`))?.[0] ?? null, `"${key}" key in the /inquiry payload`).toBeNull();
  }
  // ...and none of the fixtures' wording travels with the form either.
  for (const p of PRODUCTS) expect(html, `${p.id} short description in the /inquiry payload`).not.toContain(p.shortDescription);
  // The model the visitor came for is still there to pick.
  expect(html).toContain(PRODUCTS[0].name);
});

test('the content guard bites: an empty, trivial or heading-less body is rejected', () => {
  expect(() => assertRealContent('', 'empty')).toThrow(/no <h1>/);
  expect(() => assertRealContent('<html></html>', 'trivial')).toThrow(/no <h1>/);
  expect(() => assertRealContent('<html><body><h1>Oops</h1></body></html>', 'short')).toThrow(/visible characters/);
  // Scripts and styles do not count as content, however long.
  const padded = `<h1>Oops</h1><script>${'x'.repeat(5000)}</script><style>${'y'.repeat(5000)}</style>`;
  expect(() => assertRealContent(padded, 'script-padded')).toThrow(/visible characters/);
  expect(() => assertRealContent(`<h1>Speakers</h1><p>${'word '.repeat(60)}</p>`, 'real')).not.toThrow();
});

test('/product/<slug> permanently redirects to the inquiry for that model, and /cart is gone', async ({ request }) => {
  const res = await request.get(`/product/${SLUG}`, { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toContain(`/inquiry?product=${SLUG}`);
  expect((await request.get('/product/no-such-model', { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get('/cart')).status()).toBe(404);
});

test('sitemap lists every datasheet and the public pages, and no checkout, cart, product, search or api URL', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const p of PRODUCTS) expect(xml).toContain(`/models/${p.slug}`);
  for (const path of ['/shop', '/about', '/help', '/inquiry', '/legal/terms', '/legal/privacy']) expect(xml).toContain(`${path}<`);
  expect(xml).not.toMatch(/\/(checkout|cart|product|search|api)(\/|<)/);
  expect(xml).not.toContain('₱');
});

test('robots.txt allows the public site, keeps /api/ and /checkout/ out and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  expect(body).toMatch(/Allow: \//);
  expect(body).toMatch(/Disallow: \/api\//);
  expect(body).toMatch(/Disallow: \/checkout\//);
  // The token itself is never in robots.txt.
  expect(body).not.toContain(DEV_CHECKOUT_TOKEN);
});

test('the checkout is link-only: closed to a wrong token, live and noindex for the right one, linked from nowhere', async ({ request }) => {
  expect((await request.get('/checkout')).status()).toBe(404);
  expect((await request.get('/checkout/wrong-token-wrong-token-wrong')).status()).toBe(404);
  const ok = await request.get(`/checkout/${DEV_CHECKOUT_TOKEN}`);
  expect(ok.status()).toBe(200);
  expect(await ok.text()).toMatch(/<meta name="robots" content="noindex/);
  // The API answers 404 without the token in the body.
  expect((await request.post('/api/checkout', { data: { items: [] } })).status()).toBe(404);
  // Unlinked: neither the home page markup nor its payload mentions the checkout.
  const home = await (await request.get('/')).text();
  expect(home).not.toMatch(/checkout/i);
  expect(home).not.toContain(DEV_CHECKOUT_TOKEN);
});
