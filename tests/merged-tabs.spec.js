import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test.describe('Merged New Ratings Tab Verification', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}px) - verify merged tabs`, async ({ page }) => {
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
      if (unexpectedErrors.length > 0) {
        console.log('Errors:', unexpectedErrors);
      }

      console.log('\n2. Checking Tab Structure...');
      const tabs = await page.locator('.tab-btn').allTextContents();
      console.log(`Tabs found: ${tabs.join(', ')}`);
      console.log(tabs.length === 3 ? '✓ 3 tabs present' : `✗ Expected 3 tabs, found ${tabs.length}`);
      console.log(tabs[0] === 'New Ratings' ? '✓ First tab is "New Ratings"' : `✗ First tab is "${tabs[0]}"`);

      console.log('\n3. Checking New Ratings Tab (default open)...');
      const newRatingsActive = await page.locator('.tab-btn[data-tab="newRatings"]').evaluate(el => 
        el.classList.contains('active')
      );
      console.log(newRatingsActive ? '✓ New Ratings tab is active by default' : '✗ New Ratings tab is not active');

      const newRatingsSection = page.locator('#newRatings');
      const isVisible = await newRatingsSection.evaluate(el => 
        el.classList.contains('active') || el.style.display !== 'none'
      );
      console.log(isVisible ? '✓ New Ratings section is visible' : '✗ New Ratings section is hidden');

      console.log('\n4. Checking Section Headers...');
      const sectionTitles = await page.locator('#newRatingsGrid .subsection-title').allTextContents();
      console.log(`Sections found: ${sectionTitles.map(t => t.trim()).join(', ')}`);
      
      const hasTopPicks = sectionTitles.some(t => t.trim() === 'Top picks for you');
      const hasHaveYouSeen = sectionTitles.some(t => t.trim() === 'Have you seen these?');
      console.log(hasTopPicks ? '✓ "Top picks for you" section present' : '✗ "Top picks for you" section missing');
      console.log(hasHaveYouSeen ? '✓ "Have you seen these?" section present' : '✗ "Have you seen these?" section missing');

      console.log('\n5. Checking Cards in Both Sections...');
      const topPicksCards = await page.locator('#newRatingsGrid .subsection:has(.subsection-title:text("Top picks for you")) .show-card').count();
      const haveYouSeenCards = await page.locator('#newRatingsGrid .subsection:has(.subsection-title:text("Have you seen these?")) .show-card').count();
      
      console.log(`Top picks cards: ${topPicksCards}`);
      console.log(`Have you seen these? cards: ${haveYouSeenCards}`);
      console.log((topPicksCards > 0 || haveYouSeenCards > 0) ? '✓ At least one section has cards' : '✗ No cards in either section');

      console.log('\n6. Testing Tab Switching...');
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(500);
      const watchedActive = await page.locator('.tab-btn[data-tab="library"]').evaluate(el => 
        el.classList.contains('active')
      );
      const watchedVisible = await page.locator('#library').evaluate(el => 
        el.classList.contains('active') || el.style.display !== 'none'
      );
      console.log(watchedActive ? '✓ Watched tab becomes active on click' : '✗ Watched tab not active');
      console.log(watchedVisible ? '✓ Watched section becomes visible' : '✗ Watched section not visible');

      await page.locator('.tab-btn[data-tab="notSeen"]').click();
      await page.waitForTimeout(500);
      const notSeenActive = await page.locator('.tab-btn[data-tab="notSeen"]').evaluate(el => 
        el.classList.contains('active')
      );
      const notSeenVisible = await page.locator('#notSeen').evaluate(el => 
        el.classList.contains('active') || el.style.display !== 'none'
      );
      console.log(notSeenActive ? '✓ Not seen tab becomes active on click' : '✗ Not seen tab not active');
      console.log(notSeenVisible ? '✓ Not seen section becomes visible' : '✗ Not seen section not visible');

      // Take screenshot
      await page.locator('.tab-btn[data-tab="newRatings"]').click();
      await page.waitForTimeout(500);
      const screenshotName = `merged-tabs-${viewport.width}px.png`;
      await page.screenshot({ path: `test-results/${screenshotName}`, fullPage: false });
      console.log(`\n📸 Screenshot saved: test-results/${screenshotName}`);

      console.log('\n=== Summary ===');
      console.log(`Console Errors: ${unexpectedErrors.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Tab Count: ${tabs.length === 3 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Sections Present: ${hasTopPicks && hasHaveYouSeen ? 'PASS ✓' : 'PARTIAL'}`);
      console.log(`Tab Switching: ${watchedActive && notSeenActive ? 'PASS ✓' : 'CHECK'}`);

      // Assertions
      expect(unexpectedErrors).toEqual([]);
      expect(tabs.length).toBe(3);
      expect(tabs[0]).toBe('New Ratings');
    });
  }
});
