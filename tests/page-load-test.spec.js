import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Basic page load test', async ({ page }) => {
  console.log('\n=== Testing basic page load ===\n');
  
  // Track all console messages
  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  await page.goto(DEPLOYED_URL);
  
  console.log('\nWaiting 5 seconds...\n');
  await page.waitForTimeout(5000);
  
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  const tabBtns = await page.locator('.tab-btn').count();
  console.log(`Tab buttons found: ${tabBtns}`);
  
  const errors = logs.filter(l => l.type === 'error');
  console.log(`\nTotal errors: ${errors.length}`);
  
  expect(tabBtns).toBeGreaterThan(0);
});
