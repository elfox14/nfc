import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile\.spec\.ts/
    }
  ],
  webServer: {
    command: 'npm start',
    url: `${baseURL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: new URL(baseURL).port || '3000',
      MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mcnfc_e2e',
      MONGO_DB: process.env.MONGO_DB || 'mcnfc_e2e',
      JWT_SECRET: process.env.JWT_SECRET || 'e2e-jwt-secret-at-least-thirty-two-characters',
      TOKEN_HASH_SECRET: process.env.TOKEN_HASH_SECRET || 'e2e-hash-secret-at-least-thirty-two-characters',
      COOKIE_SIGNING_SECRET: process.env.COOKIE_SIGNING_SECRET || 'e2e-cookie-secret-at-least-thirty-two-characters',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'e2e-google-client-id',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'e2e-google-client-secret',
      PUBLIC_BASE_URL: `${baseURL}/nfc`,
      SITE_BASE_URL: baseURL,
      ALLOWED_ORIGINS: `${baseURL},http://localhost:3000`,
      EMAIL_PROVIDER: 'console',
      EMAIL_API_KEY: ''
    }
  }
});
