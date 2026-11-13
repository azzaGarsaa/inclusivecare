import { defineConfig } from '@playwright/test';

/**
 * Browser tests for the critical journeys and for accessibility.
 * They need the infrastructure (`npm run infra:up`) and a seeded database
 * (`npm run db:seed -w api`). The API and web servers are started here unless
 * they are already running.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  // One worker and a fixed order: the tests share accounts and the sign-in rate limit.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    // Uses the Chrome already installed on the machine instead of downloading a browser.
    channel: 'chrome',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run build -w api && npm run start:prod -w api',
      url: 'http://localhost:3333/api/v1/health',
      reuseExistingServer: true,
      cwd: '..',
      timeout: 120_000,
    },
    {
      command: 'npm run start -w web',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      cwd: '..',
      timeout: 120_000,
    },
  ],
});
