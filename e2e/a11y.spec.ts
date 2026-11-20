import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PRODUCTS } from '../lib/catalog/fixtures';
import { blockRealMaya, fillInquiry, openFilterPanel, stubInquirySaved } from './support';

const himig8 = PRODUCTS.find((p) => p.id === 'ja-fr-02')!;
const lakasD4 = PRODUCTS.find((p) => p.id === 'ja-am-01')!;

test.beforeEach(async ({ page }) => {
  await blockRealMaya(page.context());
});

async function expectNoBlockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.length} node(s), first: ${v.nodes[0]?.target.join(' ')}`),
  ).toEqual([]);
}

const STATIC_PAGES = ['/', '/help', '/about', '/legal/terms', '/legal/privacy', '/shop/category/ceiling'];

for (const path of STATIC_PAGES) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoBlockingViolations(page);
  });
}

test('no serious or critical accessibility violations on a datasheet with a response curve', async ({ page }) => {
  await page.goto(`/models/${himig8.slug}`);
  await expect(page.getByRole('img', { name: /Nominal frequency response/ })).toBeVisible();
  await expectNoBlockingViolations(page);
});

test('no serious or critical accessibility violations on a datasheet with the not-applicable state', async ({ page }) => {
  await page.goto(`/models/${lakasD4.slug}`);
  await expect(page.getByText('Not applicable: this product does not produce sound.')).toBeVisible();
  await expectNoBlockingViolations(page);
});

test('no serious or critical accessibility violations on the home page with a venue chosen', async ({ page }) => {
  await page.goto('/');
  const finder = page.getByRole('region', { name: 'Start from the room.' });
  await finder.locator('label', { hasText: 'Gyms & studios' }).click();
  await expect(finder.getByRole('link', { name: 'Ask about this venue' })).toBeVisible();
  await expectNoBlockingViolations(page);
});

// The filter form is collapsed on a phone and opened by an effect on desktop: scan it OPEN,
// otherwise its labels and selects are never checked.
test('no serious or critical accessibility violations on /shop with the filter panel open', async ({ page }) => {
  await page.goto('/shop');
  await openFilterPanel(page);
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
  await expectNoBlockingViolations(page);
});

test('no serious or critical accessibility violations on /shop?category=ceiling with filter chips', async ({ page }) => {
  await page.goto('/shop?category=ceiling&finish=white');
  await openFilterPanel(page);
  await expect(page.getByRole('link', { name: /^Remove filter/ }).first()).toBeVisible();
  await expectNoBlockingViolations(page);
});

test('no serious or critical accessibility violations on /inquiry with a model pre-filled', async ({ page }) => {
  await page.goto(`/inquiry?product=${himig8.slug}`);
  await expect(page.getByRole('region', { name: 'Models you are interested in' }).getByRole('listitem').first()).toContainText(himig8.name);
  await expectNoBlockingViolations(page);
});

test('no serious or critical accessibility violations on /inquiry with its error summary showing', async ({ page }) => {
  await page.goto('/inquiry');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix the following' })).toBeVisible();
  await expectNoBlockingViolations(page);
});

test('no serious or critical accessibility violations on the inquiry confirmation', async ({ page }) => {
  await stubInquirySaved(page);
  await page.goto(`/inquiry?product=${himig8.slug}`);
  await fillInquiry(page);
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'We have received your inquiry' })).toBeVisible();
  await expectNoBlockingViolations(page);
});

test('the mega-menu works from the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The mega-menu is the desktop navigation; mobile uses the drawer.');
  await page.goto('/');
  const type = page.getByRole('button', { name: 'Product type' });
  await type.focus();
  await page.keyboard.press('Enter');
  await expect(type).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#menu-category').getByRole('link', { name: 'Ceiling speakers' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(type).toHaveAttribute('aria-expanded', 'false');
  await expect(type).toBeFocused();
});

test('with reduced motion the hero meter and the response trace settle to a still frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const bar = page.locator('.led-bar').first();
  const duration = await bar.evaluate((el) => getComputedStyle(el).animationDuration);
  // globals.css clamps every animation to 0.01ms under prefers-reduced-motion.
  expect(parseFloat(duration)).toBeLessThan(0.001);
});
