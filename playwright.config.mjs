import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  use: {baseURL: 'http://127.0.0.1:8798', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  webServer: {
    command: 'node server/food-server.mjs', url: 'http://127.0.0.1:8798/api/food/health', reuseExistingServer: false,
    env: {FOOD_PORT: '8798', FOOD_PUBLIC_ORIGIN: 'http://127.0.0.1:8798', FOOD_DATA_FILE: '.data/e2e-food.json'},
  },
});
