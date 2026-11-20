import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The checkout is reachable only by someone who was handed the link. Nothing the
// public site renders may point at it, redirect to it or name it. This scans the
// SOURCE of every route and component outside the checkout's own directories.
// (components/layout/no-checkout-links.test.tsx renders the site chrome and checks
// its hrefs; this is the broader, source-level version.)

const root = path.resolve(__dirname, '..', '..');
const OWN = [path.join('app', 'checkout'), path.join('app', 'api', 'checkout'), path.join('components', 'checkout')];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

/** Code only: comments may explain the rule, and a module specifier such as '@/lib/checkout/parse' is an import, not a link. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\bfrom\s+(['"])[^'"]+\1/g, '')
    .replace(/\bimport\s+(['"])[^'"]+\1/g, '');
}

const files = ['app', 'components']
  .flatMap((d) => walk(path.join(root, d)))
  .filter((f) => !OWN.some((own) => path.relative(root, f).startsWith(own)));

describe('nothing public links to the checkout', () => {
  it('scans the public routes and components', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.map((f) => path.relative(root, f))).toContain(path.join('components', 'layout', 'Header.tsx'));
  });

  it('no source outside the checkout names /checkout, with ONE exception: robots.txt disallows the prefix', () => {
    const offenders = files
      .filter((f) => /\/checkout/.test(code(f)))
      .map((f) => path.relative(root, f))
      .filter((f) => f !== path.join('app', 'robots.ts'));
    expect(offenders).toEqual([]);
  });

  it('the robots exception is a bare Disallow prefix: it never contains a token or a full link', () => {
    const robots = code(path.join(root, 'app', 'robots.ts'));
    const mentions = robots.match(/\/checkout[^'"`\s,\]]*/g) ?? [];
    expect(mentions).toEqual(['/checkout/']);
  });

  it('the checkout is not in the sitemap source, and no public file mentions the link token variable', () => {
    expect(code(path.join(root, 'app', 'sitemap.ts'))).not.toMatch(/checkout/i);
    const offenders = files.filter((f) => /CHECKOUT_LINK_TOKEN|checkoutPath|getCheckoutToken/.test(code(f)));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });

  it('only the checkout page and its API render a checkout: no other route imports the checkout client', () => {
    const offenders = files.filter((f) => /CheckoutClient/.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
