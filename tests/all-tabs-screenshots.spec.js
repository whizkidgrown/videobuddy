import { test } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Take screenshots of all tabs at 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  const tabs = [
    { id: 'topPicks', name: 'Top 5' },
    { id: 'todaysBatch', name: 'Rate Today' },
    { id: 'library', name: 'Watched' },
    { id: 'notSeen', name: 'Not Seen' }
  ];

  for (const tab of tabs) {
    await page.locator(`.tab-btn[data-tab="${tab.id}"]`).click();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `test-results/${tab.id}-1280px.png`, 
      fullPage: false 
    });
    console.log(`✓ Screenshot: ${tab.name}`);
  }
});
