import { expect, type BrowserContext, type Page } from '@playwright/test';

/** The dev token the Playwright web server is started with (playwright.config.ts). 26 URL-safe characters. */
export const DEV_CHECKOUT_TOKEN = 'devlink0123456789abcdefghij';

/**
 * Safety net: any real Maya / PayMaya host is aborted so a real payment page
 * can never load from a test.
 */
export async function blockRealMaya(context: BrowserContext) {
  await context.route(/^https:\/\/([^/]+\.)?(mymaya|paymaya)\.me\//, (route) => route.abort());
}

/**
 * Makes sure the filter form is open and visible. It starts closed on a phone and is
 * opened by a small effect at desktop width, so: click the summary if the Product type
 * select is not visible yet, then wait for it to be.
 */
export async function openFilterPanel(page: Page) {
  const type = page.getByLabel('Product type', { exact: true });
  if (!(await type.isVisible())) await page.getByText(/^Filter & sort/).click();
  await expect(type).toBeVisible();
  return type;
}

export const INQUIRY_REFERENCE = 'JAI-ABCDEF123456';

/** Stubs POST /api/inquiry with a saved inquiry. The hermetic env has no database, so the real endpoint answers 503. */
export async function stubInquirySaved(page: Page) {
  await page.route('**/api/inquiry', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reference: INQUIRY_REFERENCE }) }),
  );
}

/** Fills the required inquiry fields (plus the optional role) like a buyer would. */
export async function fillInquiry(page: Page) {
  await page.getByLabel('Company', { exact: true }).fill('Reyes Interiors');
  await page.getByLabel('Contact name', { exact: true }).fill('Ana Reyes');
  await page.getByLabel('Email', { exact: true }).fill('ana@reyes-interiors.example');
  await page.getByLabel(/^Your role/).fill('Operations manager');
}
