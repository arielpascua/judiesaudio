import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Guards the brand and the honesty rules across every source file, so a later
// change cannot quietly reintroduce the rug store, a price on a public page, or a
// fact nobody supplied (a founding year, a certification, a warranty, a reply time).
//
// The scans read CUSTOMER-FACING TEXT ONLY: string literals, template text and JSX
// text, taken from the TypeScript AST. Comments, identifiers (`priceFor`), property
// names, import paths and type-level literals are not copy and are never looked at,
// so there is no allow-list of identifiers to keep in step with the code.

const ROOT = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const allFiles = ['app', 'components', 'lib'].flatMap((d) => walk(path.join(ROOT, d)));

// Money lives here, on purpose: the private checkout page, its API, and the libraries
// only they use. Everything else is public. There is deliberately no per-file
// allow-list beyond this: with the scan reading copy only, no public file needs one.
const CHECKOUT_PREFIXES = [
  'app/checkout/',
  'app/api/checkout/',
  'components/checkout/',
  'components/cart/',
  'lib/checkout/',
  'lib/cart/',
  'lib/payments/',
  'lib/pricing',
  'lib/format',
  'lib/server/orders',
];
const isPublic = (f: string) => !CHECKOUT_PREFIXES.some((p) => rel(f).startsWith(p));
const publicFiles = allFiles.filter(isPublic);

// Declarations whose string value is deliberately skipped, BY NAME (and nothing else in their file):
//  - DELIVERY_NOTE: the checkout's delivery sentence (mentions payment); it must never be rendered publicly.
const EXEMPT_DECLARATIONS = new Set(['DELIVERY_NOTE']);

/** Every piece of customer-facing text in `source`: string literals, template text and JSX text. */
function customerText(source: string, fileName = 'x.tsx'): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node)) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && EXEMPT_DECLARATIONS.has(node.name.text)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) out.push(node.text);
    else if (ts.isJsxText(node)) out.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const hits = (re: RegExp, source: string, fileName?: string) => customerText(source, fileName).filter((t) => re.test(t));
const scan = (re: RegExp, files: string[]) =>
  files.flatMap((f) => hits(re, readFileSync(f, 'utf8'), f).map((t) => `${rel(f)}: ${t.trim().slice(0, 80)}`));

// The patterns live HERE, once, so the scans and the positive controls at the
// bottom run exactly the same regexes: a guard that can never match guards nothing.
const PATTERNS = {
  /** R-B2B-1: a peso amount or sign, a price, an offer, or wording about paying. */
  money: /₱|\bpesos?\b|\bpric(?:e|es|ed|ing)\b|\boffers\b|\bmaya\b|\bpay(?:s|ing|ment|ments)?\b|\bpaid\b/i,
  /** The rug store this was copied from. */
  rugStore: /\btaruuv\b|\brugs?\b|\bcarpets?\b/i,
  /** Facts nobody supplied. "showroom" only as a claim ("our showroom"), not as a venue type ("Retail & showrooms"). */
  invented:
    /\bsince\s+(?:19|20)\d{2}\b|years of experience|\bwarrant(?:y|ies)\b|\b(?:our|a|the|visit(?:\s+our)?)\s+showrooms?\b|\bshowrooms?\s+(?:is|are|in|at|hours|open)\b|\bbranch(?:es)?\b|store[-_ ]?locator|trusted by|within\s+24|same[- ]day|free quote/i,
  /** Certification claims: ISO is case-sensitive so words like "iso" in other words are not caught. */
  iso: /\bISO(?:\s?\d+)?\b/,
  socialProof:
    /\b(?:best[- ]?sellers?|top sellers?|only \d+ left|selling fast|limited[- ](?:time|stock|offer)|low stock|hurry|customer reviews?|star rating|\d+% off|click and collect)\b|★/i,
  paidClaim: /\b(?:payment (?:received|confirmed|successful)|order (?:is |has been )?paid|thank you for (?:your )?payment)\b/i,
  machinery: /\b(?:compareAtPrice|reviewCount|ratingValue|aggregateRating|StarRating|countdown)\b/i,
} as const;

describe('the guard scans a real set of files', () => {
  it('covers the public app, components and lib, and skips only the checkout', () => {
    const scanned = publicFiles.map(rel);
    expect(scanned.length).toBeGreaterThan(40);
    expect(scanned).toEqual(
      expect.arrayContaining([
        'components/home/Hero.tsx', 'components/shop/ProductCard.tsx', 'app/models/[slug]/page.tsx',
        'lib/legal.ts', 'lib/site.ts', 'app/help/page.tsx', 'lib/catalog/fixtures.ts',
      ]),
    );
    expect(scanned.filter((r) => CHECKOUT_PREFIXES.some((p) => r.startsWith(p)))).toEqual([]);
  });
});

describe('R-B2B-1: no price or payment wording on a public page', () => {
  it('no string literal or JSX text mentions a price, peso, offer, Maya or paying', () => {
    expect(scan(PATTERNS.money, publicFiles)).toEqual([]);
  });

  it('DELIVERY_NOTE (mentions payment) is only ever defined in lib/site.ts, never used by a public file', () => {
    const users = publicFiles
      .filter((f) => rel(f) !== 'lib/site.ts' && /(?<![A-Za-z_])DELIVERY_NOTE(?![A-Za-z_])/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(users).toEqual([]);
  });

  it('no public source declares an offer: no `offers` key and no schema.org Offer type', () => {
    const bad = publicFiles.filter((f) => /\boffers\s*:|['"]offers['"]|@type['"]?\s*:\s*['"](?:Aggregate)?Offer/.test(readFileSync(f, 'utf8'))).map(rel);
    expect(bad).toEqual([]);
  });

  it('the price lives on Product.packs only: public sources never import the priced catalogue data', () => {
    const importers = publicFiles
      .filter((f) => !rel(f).startsWith('lib/catalog/'))
      .filter((f) => /from ['"]@\/lib\/catalog\/fixtures['"]/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(importers).toEqual([]);
  });

  it('public components accept PublicProduct, never the priced Product or Pack types', () => {
    const offenders = publicFiles
      .filter((f) => rel(f).startsWith('components/') || (rel(f).startsWith('app/') && !rel(f).startsWith('app/api/')))
      .filter((f) => {
        const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        return sf.statements.some(
          (st) =>
            ts.isImportDeclaration(st) &&
            ts.isStringLiteral(st.moduleSpecifier) &&
            st.moduleSpecifier.text === '@/lib/catalog/types' &&
            st.importClause?.namedBindings !== undefined &&
            ts.isNamedImports(st.importClause.namedBindings) &&
            st.importClause.namedBindings.elements.some((e) => ['Product', 'Pack'].includes((e.propertyName ?? e.name).text)),
        );
      })
      .map(rel);
    expect(offenders).toEqual([]);
  });
});

describe('the rug store is gone', () => {
  it('no customer text anywhere (checkout included) says Taruuv, rug or carpet', () => {
    expect(scan(PATTERNS.rugStore, allFiles)).toEqual([]);
  });
});

describe('honesty rules: no invented facts on a public page', () => {
  it('no founding year, experience claim, warranty, showroom, branch, locator, client claim or timed promise', () => {
    expect(scan(PATTERNS.invented, publicFiles)).toEqual([]);
  });

  it('no certification claim (ISO)', () => {
    expect(scan(PATTERNS.iso, publicFiles)).toEqual([]);
  });

  it('no scarcity, social-proof or discount copy, and no rating machinery', () => {
    expect(scan(PATTERNS.socialProof, publicFiles)).toEqual([]);
    expect(scan(PATTERNS.machinery, publicFiles)).toEqual([]);
  });

  it('no copy claims an order is paid', () => {
    expect(scan(PATTERNS.paidClaim, allFiles)).toEqual([]);
  });

  it('there is no stores, locations or cart route', () => {
    for (const dir of ['stores', 'locations', 'cart']) expect(existsSync(path.join(ROOT, 'app', dir)), dir).toBe(false);
  });
});

describe('positive control: the same regexes DO catch the copy they exist to catch', () => {
  it.each([
    ['money', 'export const copy = "Pay with Maya";'],
    ['money', "export const copy = 'Prices in Philippine pesos';"],
    ['money', 'export const copy = `Only ₱${amount}`;'],
    ['money', 'export const A = () => <p>Every model priced up front</p>;'],
    ['money', 'export const A = () => <a title="See our pricing">x</a>;'],
    ['money', "export const metadata = { description: 'Best price on speakers' };"],
    ['money', "export const copy = 'Pay now';"],
    ['money', "export const copy = 'Already paid?';"],
    ['rugStore', "export const copy = 'Rugs for business';"],
    ['rugStore', "export const copy = 'Welcome to Taruuv';"],
    ['rugStore', "export const copy = 'A woven carpet';"],
    ['invented', "export const copy = 'Online since 2023';"],
    ['invented', "export const copy = 'Over 20 years of experience';"],
    ['invented', "export const copy = 'Backed by a 5 year warranty';"],
    ['invented', "export const copy = 'Visit our showroom';"],
    ['invented', "export const copy = 'Find your nearest branch';"],
    ['invented', "export const copy = 'Store Locator';"],
    ['invented', "export const copy = 'Trusted by 500 venues';"],
    ['invented', "export const copy = 'We reply within 24 hours';"],
    ['invented', "export const copy = 'Same day dispatch';"],
    ['invented', "export const copy = 'Get a free quote';"],
    ['iso', "export const copy = 'ISO 9001 certified';"],
    ['socialProof', "export const copy = 'Best seller';"],
    ['socialProof', "export const copy = 'Only 3 left';"],
    ['paidClaim', "export const copy = 'Payment received';"],
  ] as const)('%s catches %j', (name, source) => {
    expect(hits(PATTERNS[name], source)).not.toEqual([]);
  });

  it('does not flag honest copy, identifiers, comments, imports or types', () => {
    const source = `
      import { formatPeso } from '@/lib/pricing';
      // Pay with Maya: a developer note, not copy
      /** price in pesos */
      export type PublicPack = Omit<Pack, 'price'>;
      export function priceFor(price: number) { return formatPeso(price); }
      export const A = () => <p>Commercial audio, specified on the datasheet.</p>;
      export const B = () => <p>Retail &amp; showrooms</p>;
      export const C = 'payload and Pamayanan and Mayon';
    `;
    for (const name of ['money', 'rugStore', 'invented', 'iso'] as const) expect(hits(PATTERNS[name], source), name).toEqual([]);
  });

  it('exempts only the named declarations, nothing else in the same file', () => {
    const note = "export const DELIVERY_NOTE = 'Fees are confirmed after your Maya payment.';";
    expect(hits(PATTERNS.money, note)).toEqual([]);
    expect(hits(PATTERNS.money, `${note}\nexport const OTHER = 'Pay with Maya';`)).toHaveLength(1);
    expect(hits(PATTERNS.money, "export const TAGLINE = 'Pay for rooms';")).toHaveLength(1);
  });

  it('flags ISO as a word only, so ordinary words are safe', () => {
    expect(hits(PATTERNS.iso, "export const a = 'isolation and visor';")).toEqual([]);
    expect(hits(PATTERNS.iso, "export const a = 'ISO certified';")).toHaveLength(1);
  });
});
