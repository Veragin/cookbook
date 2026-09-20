import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke-test config. Chrome and ffmpeg are baked into the dev image, so we use
 * the installed channel rather than downloading a bundled browser.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8170',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8170',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
