import { test } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Mobile screenshots at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // Watched tab
  await page.locator('.tab-btn[data-tab="library"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: `test-results/library-390px.png`, 
    fullPage: false 
  });
  console.log('✓ Watched (390px)');

  // Not Seen tab
  await page.locator('.tab-btn[data-tab="notSeen"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: `test-results/notSeen-390px.png`, 
    fullPage: false 
  });
  console.log('✓ Not Seen (390px)');
});
