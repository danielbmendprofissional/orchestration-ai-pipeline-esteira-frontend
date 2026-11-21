import { defineConfig, devices } from '@playwright/test';

// E2E + acessibilidade (ADR-0005: Playwright + axe-core, WCAG 2.1 AA).
// E2E_PORT permite rodar ao lado de um `ng serve` já aberto na 4200 sem reaproveitar o servidor dele
// (que pode estar com código antigo).
const porta = process.env['E2E_PORT'] ?? '4200';
const url = `http://localhost:${porta}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'line' : 'list',
  use: {
    baseURL: url,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm start -- --port ${porta}`,
    url,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
