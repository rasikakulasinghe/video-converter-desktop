import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron',
      testDir: './tests/e2e',
      use: {
        // Configure Electron-specific options
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'web-browser',
      testDir: './tests/browser',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5174',
      },
    },
  ],
  // Remove webServer for Electron tests - we'll launch Electron directly
});