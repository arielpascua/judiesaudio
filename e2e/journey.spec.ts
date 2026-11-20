import { expect, test, type Page } from '@playwright/test';
import { PRODUCTS } from '../lib/catalog/fixtures';
import { INQUIRY_REFERENCE, blockRealMaya, fillInquiry, openFilterPanel, stubInquirySaved } from './support';

const himig8 = PRODUCTS.find((p) => p.id === 'ja-fr-02')!;
const lakasD4 = PRODUCTS.find((p) => p.id === 'ja-am-01')!;
// Independent oracle for the filter (not the app's own filter function).
const subwoofers = PRODUCTS.filter((p) => p.category === 'subwoofer');

test.beforeEach(async ({ page }) => {
  await blockRealMaya(page.context());
});

/** The models listed on the inquiry form, as a region (the first list item is the first line). */
const inquiryLines = (page: Page) => page.getByRole('region', { name: 'Models you are interested in' });

async function browseToSubwoofers(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Browse the datasheets' }).first().click();
  await expect(page).toHaveURL(/\/shop$/);
  // The filter panel starts closed on a phone (open beside the grid on desktop): open it like a buyer would.
  const type = await openFilterPanel(page);
  await type.selectOption('subwoofer');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/category=subwoofer/);
}

test('browse and filter: the URL drives exactly the expected models', async ({ page }) => {
  await browseToSubwoofers(page);
  const other = PRODUCTS.find((p) => p.category !== 'subwoofer')!;
  await expect(page.getByText(new RegExp(`^${subwoofers.length} models?$`))).toBeVisible();
  const main = page.locator('#main');
  await expect(main.getByRole('link', { name: new RegExp(subwoofers[0].name) }).first()).toBeVisible();
  await expect(main.getByRole('link', { name: new RegExp(other.name) })).toHaveCount(0);
});

test('garbage filter URL still renders', async ({ page }) => {
  const res = await page.goto('/shop?category=zzz&minPrice=abc&sort=%3Cscript%3E&application=worship&application=retail');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'All products' })).toBeVisible();
});

test('venue finder: pick a venue, follow a product type into the filtered shop', async ({ page }) => {
  await page.goto('/');
  const finder = page.getByRole('region', { name: 'Start from the room.' });
  await finder.locator('label', { hasText: 'Houses of worship' }).click();
  const worship = PRODUCTS.filter((p) => p.applications.includes('worship'));
  await expect(finder.getByText(`${worship.length} models in the catalogue`)).toBeVisible();
  await finder.getByRole('link', { name: /^Column arrays/ }).click();
  await expect(page).toHaveURL(/\/shop\?application=worship&category=column-array$/);
  await expect(page.getByRole('heading', { name: 'All products' })).toBeVisible();
  await expect(page.getByText(/^2 models$/)).toBeVisible();
});

test('venue finder: the venue and floor area arrive in the inquiry note', async ({ page }) => {
  await page.goto('/');
  const finder = page.getByRole('region', { name: 'Start from the room.' });
  await finder.locator('label', { hasText: 'Restaurants & bars' }).click();
  await finder.getByLabel(/^Floor area/).selectOption('50-150');
  await finder.getByRole('link', { name: 'Ask about this venue' }).click();
  await expect(page).toHaveURL(/\/inquiry\?venue=restaurant-bar&area=50-150$/);
  await expect(page.getByLabel(/^Notes/)).toHaveValue('Venue: Restaurants & bars. Floor area: 50 – 150 m².');
});

test('a model page is a datasheet: specs, a drawn response curve and the way to ask', async ({ page }) => {
  await page.goto(`/models/${himig8.slug}`);
  await expect(page.getByRole('heading', { level: 1, name: himig8.name })).toBeVisible();
  await expect(page.getByRole('table', { name: `Specifications of ${himig8.name}` })).toContainText('55 Hz – 20 kHz');
  await expect(page.getByRole('img', { name: /Nominal frequency response of Himig 8/ })).toBeVisible();
  await expect(page.locator('path.trace-draw')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Ask about this model' }).first()).toHaveAttribute('href', `/inquiry?product=${himig8.slug}`);
});

test('a model that makes no sound says so instead of drawing a curve', async ({ page }) => {
  await page.goto(`/models/${lakasD4.slug}`);
  await expect(page.getByText('Not applicable: this product does not produce sound.')).toBeVisible();
  await expect(page.locator('path.trace-draw')).toHaveCount(0);
});

test('inquiry: browse, open a datasheet, ask about it, send, see the reference', async ({ page }) => {
  let posted: unknown;
  await stubInquirySaved(page);
  // Registered last, so it runs first: records the request, then hands it on to the stub.
  await page.route('**/api/inquiry', async (route) => {
    posted = route.request().postDataJSON();
    await route.fallback();
  });
  await browseToSubwoofers(page);
  await page.locator('#main').getByRole('link', { name: new RegExp(subwoofers[0].name) }).first().click();

  // The card opens the datasheet; "Ask about this model" opens the inquiry with THAT model as the first line.
  await expect(page).toHaveURL(new RegExp(`/models/${subwoofers[0].slug}$`));
  await page.getByRole('link', { name: 'Ask about this model' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/inquiry\\?product=${subwoofers[0].slug}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Send an inquiry' })).toBeVisible();
  await expect(inquiryLines(page).getByRole('listitem').first()).toContainText(subwoofers[0].name);

  await fillInquiry(page);
  await page.getByLabel(`Pack for ${subwoofers[0].name}`).selectOption('pair');
  await page.getByLabel(`Quantity for ${subwoofers[0].name}`).fill('3');
  await page.getByRole('button', { name: 'Send inquiry' }).click();

  const thanks = page.getByRole('status').filter({ hasText: 'We have received your inquiry' });
  await expect(thanks).toBeVisible();
  await expect(thanks).toContainText(INQUIRY_REFERENCE);
  expect(posted).toMatchObject({
    company: 'Reyes Interiors',
    contactName: 'Ana Reyes',
    email: 'ana@reyes-interiors.example',
    role: 'Operations manager',
    items: [{ productId: subwoofers[0].id, packId: 'pair', quantity: 3 }],
  });
  // A price never travels in either direction.
  expect(JSON.stringify(posted)).not.toMatch(/price|₱/i);
});

test('inquiry: with no database the real endpoint answers 503 and the page does NOT say it was sent', async ({ page }) => {
  await page.goto(`/inquiry?product=${himig8.slug}`);
  await fillInquiry(page);
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('We could not send your inquiry just now');
  await expect(page.getByText('We have received your inquiry')).toHaveCount(0);
  // Everything the buyer typed is still there.
  await expect(page.getByLabel('Company', { exact: true })).toHaveValue('Reyes Interiors');
});

test('inquiry validation: an empty send shows the error summary and sends nothing', async ({ page }) => {
  let called = false;
  await page.route('**/api/inquiry', async (route) => {
    called = true;
    await route.abort();
  });
  await page.goto('/inquiry');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix the following' })).toBeVisible();
  expect(called).toBe(false);
});

test('search finds a model by family name and links to its datasheet', async ({ page }) => {
  await page.goto('/search?q=himig');
  await expect(page.locator('#main').getByRole('link', { name: /Himig 8/ }).first()).toHaveAttribute('href', `/models/${himig8.slug}`);
});

test('mobile: the menu drawer opens and reaches the shop', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The drawer is the phone navigation.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'All products' }).click();
  await expect(page).toHaveURL(/\/shop$/);
});

test('no horizontal scroll on the home page, a datasheet and the inquiry', async ({ page }) => {
  for (const path of ['/', `/models/${himig8.slug}`, '/inquiry', '/shop']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
