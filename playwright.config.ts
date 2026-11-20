import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      // Sandbox payment link, fixtures catalogue, no database: an inquiry is NOT saved (the real endpoint
      // answers 503, which the journeys assert), and an order is not filed.
      MAYA_PAYMENT_LINK_BASE_URL: 'https://sandbox.mymaya.me',
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      CHECKOUT_RATE_LIMIT_PER_MIN: '1000',
      INQUIRY_RATE_LIMIT_PER_MIN: '1000',
      // Hermetic: ambient .env values must not change the run. An empty alias means the sandbox default.
      MAYA_MERCHANT_ALIAS: '',
      // The dev checkout link: /checkout/devlink0123456789abcdefghij (26 URL-safe characters).
      CHECKOUT_LINK_TOKEN: 'devlink0123456789abcdefghij',
      // Contact details are hidden unless set: keep the run free of the owner's real ones.
      NEXT_PUBLIC_CONTACT_EMAIL: '',
      NEXT_PUBLIC_CONTACT_PHONE: '',
    },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-360', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
  ],
});
