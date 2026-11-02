import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test.describe('Not Seen Fixes and Compact Layout Verification', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}px) - verify fixes`, async ({ page }) => {
      console.log(`\n=== Testing ${viewport.name} (${viewport.width}x${viewport.height}) ===\n`);
      
      // Track console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.setViewportSize(viewport);
      await page.goto(DEPLOYED_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      console.log('1. Checking Console Errors...');
      const unexpectedErrors = errors.filter(e => 
        !e.includes('Supabase') && 
        !e.includes('Database') &&
        !e.includes('not initialized')
      );
      console.log(unexpectedErrors.length === 0 ? '✓ No console errors' : `✗ Found ${unexpectedErrors.length} errors`);

      console.log('\n2. Checking Not Seen Tab...');
      await page.locator('.tab-btn[data-tab="notSeen"]').click();
      await page.waitForTimeout(1000);

      // Check for cards
      const notSeenCards = page.locator('#notSeenGrid .show-card');
      const cardCount = await notSeenCards.count();
      console.log(`Found ${cardCount} cards in Not Seen tab`);

      if (cardCount > 0) {
        console.log('\n3. Verifying Single Rating Control per Card...');
        
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = notSeenCards.nth(i);
          const title = await card.locator('.card-title').textContent();
          
          // Count rating controls in this card
          const ratingControls = card.locator('.rating-control');
          const controlCount = await ratingControls.count();
          
          console.log(`  Card ${i + 1} (${title.trim()}): ${controlCount} rating control(s) ${controlCount === 1 ? '✓' : '✗'}`);
        }
      }

      console.log('\n4. Checking Card Widths Across Tabs...');
      const tabWidths = {};
      
      // Check Top 5
      await page.locator('.tab-btn[data-tab="topPicks"]').click();
      await page.waitForTimeout(500);
      const topPicksCard = page.locator('#picksGrid .show-card').first();
      if (await topPicksCard.count() > 0) {
        const box = await topPicksCard.boundingBox();
        tabWidths['Top 5'] = box ? Math.round(box.width) : 0;
      }

      // Check Rate Today
      await page.locator('.tab-btn[data-tab="todaysBatch"]').click();
      await page.waitForTimeout(500);
      const batchCard = page.locator('#batchGrid .show-card').first();
      if (await batchCard.count() > 0) {
        const box = await batchCard.boundingBox();
        tabWidths['Rate Today'] = box ? Math.round(box.width) : 0;
      }

      // Check Watched
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(500);
      const libraryCard = page.locator('#libraryGrid .show-card').first();
      if (await libraryCard.count() > 0) {
        const box = await libraryCard.boundingBox();
        tabWidths['Watched'] = box ? Math.round(box.width) : 0;
      }

      console.log('Card widths by tab:');
      Object.entries(tabWidths).forEach(([tab, width]) => {
        console.log(`  ${tab}: ${width}px`);
      });

      // Check if widths are consistent (within 5px tolerance)
      const widths = Object.values(tabWidths);
      const minWidth = Math.min(...widths);
      const maxWidth = Math.max(...widths);
      const consistent = (maxWidth - minWidth) <= 5;
      console.log(consistent ? '✓ Card widths are consistent across tabs' : '✗ Card widths vary too much');

      console.log('\n5. Counting Cards Per Row at Current Width...');
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(500);
      
      const allCards = page.locator('#libraryGrid .show-card');
      const allCardCount = await allCards.count();
      
      if (allCardCount >= 2) {
        const firstBox = await allCards.first().boundingBox();
        const secondBox = await allCards.nth(1).boundingBox();
        
        if (firstBox && secondBox) {
          const sameRow = Math.abs(firstBox.y - secondBox.y) < 10;
          if (sameRow) {
            // Count cards in first row
            let cardsInRow = 1;
            for (let i = 1; i < Math.min(allCardCount, 10); i++) {
              const box = await allCards.nth(i).boundingBox();
              if (box && Math.abs(box.y - firstBox.y) < 10) {
                cardsInRow++;
              } else {
                break;
              }
            }
            console.log(`✓ ${cardsInRow} card${cardsInRow !== 1 ? 's' : ''} per row`);
          } else {
            console.log('✓ 1 card per row (stacked layout)');
          }
        }
      }

      // Take screenshot
      const screenshotName = `not-seen-layout-${viewport.width}px.png`;
      await page.locator('.tab-btn[data-tab="notSeen"]').click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/${screenshotName}`, fullPage: false });
      console.log(`\n📸 Screenshot saved: test-results/${screenshotName}`);

      console.log('\n=== Summary ===');
      console.log(`Console Errors: ${unexpectedErrors.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Single Rating Control: ${cardCount === 0 ? 'N/A' : 'CHECK ABOVE'}`);
      console.log(`Consistent Card Widths: ${consistent ? 'PASS ✓' : 'CHECK'}`);

      // Assertions
      expect(unexpectedErrors).toEqual([]);
    });
  }
});
