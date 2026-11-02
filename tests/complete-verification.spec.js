import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test.describe('Complete Site Verification', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}px) - comprehensive check`, async ({ page }) => {
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
        !e.includes('not initialized') &&
        !e.includes('suggestions')
      );
      console.log(unexpectedErrors.length === 0 ? '✓ No unexpected console errors' : `✗ Found ${unexpectedErrors.length} errors`);
      if (unexpectedErrors.length > 0) {
        console.log('Errors:', unexpectedErrors.slice(0, 3));
      }

      console.log('\n2. Checking Page Title...');
      const title = await page.title();
      console.log(title === 'VideoBuddy' ? `✓ Title is "VideoBuddy"` : `✗ Title is "${title}"`);

      console.log('\n3. Checking Header Removed...');
      const header = await page.locator('header').count();
      console.log(header === 0 ? '✓ Header removed' : '✗ Header still present');

      console.log('\n4. Checking Tabs at Top...');
      const tabsContainer = await page.locator('.tabs-container').count();
      console.log(tabsContainer > 0 ? '✓ Tabs container present' : '✗ Tabs container missing');
      
      const tabs = await page.locator('.tab-btn').allTextContents();
      console.log(`Tabs: ${tabs.join(', ')}`);
      console.log(tabs.length === 3 ? '✓ 3 tabs present' : `✗ Expected 3 tabs, found ${tabs.length}`);

      console.log('\n5. Checking Filter Icon Button...');
      const filterBtn = await page.locator('.filter-icon-btn').count();
      console.log(filterBtn > 0 ? '✓ Filter icon button present' : '✗ Filter icon button missing');

      console.log('\n6. Testing Filter Panel...');
      if (filterBtn > 0) {
        await page.locator('.filter-icon-btn').click();
        await page.waitForTimeout(500);
        
        const panelActive = await page.locator('.filter-side-panel.active').count();
        console.log(panelActive > 0 ? '✓ Filter panel opens' : '✗ Filter panel did not open');
        
        const panelVisible = await page.locator('.filter-side-panel').isVisible();
        console.log(panelVisible ? '✓ Filter panel visible' : '✗ Filter panel not visible');
        
        // Check if filters are populated
        const filterDropdowns = await page.locator('.filter-panel-content .filter-dropdown').count();
        console.log(filterDropdowns > 0 ? `✓ ${filterDropdowns} filter dropdowns in panel` : '✗ No filter dropdowns');
        
        // Close panel
        await page.locator('.filter-close-btn').click();
        await page.waitForTimeout(500);
        
        const panelClosed = await page.locator('.filter-side-panel.active').count();
        console.log(panelClosed === 0 ? '✓ Filter panel closes' : '✗ Filter panel did not close');
      }

      console.log('\n7. Checking New Ratings Tab...');
      const newRatingsActive = await page.locator('.tab-btn[data-tab="newRatings"]').evaluate(el => 
        el.classList.contains('active')
      );
      console.log(newRatingsActive ? '✓ New Ratings tab active by default' : '✗ New Ratings tab not active');
      
      const getNewPicksBtn = await page.locator('#getNewPicksBtn').count();
      console.log(getNewPicksBtn > 0 ? '✓ "Get new picks" button present' : '✗ "Get new picks" button missing');
      
      const newRatingsGrid = await page.locator('#newRatingsGrid').count();
      console.log(newRatingsGrid > 0 ? '✓ New Ratings grid present' : '✗ New Ratings grid missing');

      console.log('\n8. Testing Tab Switching...');
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(500);
      
      const watchedActive = await page.locator('.tab-btn[data-tab="library"]').evaluate(el => 
        el.classList.contains('active')
      );
      console.log(watchedActive ? '✓ Watched tab becomes active' : '✗ Watched tab not active');
      
      const libraryGrid = await page.locator('#libraryGrid').count();
      console.log(libraryGrid > 0 ? '✓ Watched grid present' : '✗ Watched grid missing');

      await page.locator('.tab-btn[data-tab="notSeen"]').click();
      await page.waitForTimeout(500);
      
      const notSeenActive = await page.locator('.tab-btn[data-tab="notSeen"]').evaluate(el => 
        el.classList.contains('active')
      );
      console.log(notSeenActive ? '✓ Not seen tab becomes active' : '✗ Not seen tab not active');
      
      const notSeenGrid = await page.locator('#notSeenGrid').count();
      console.log(notSeenGrid > 0 ? '✓ Not seen grid present' : '✗ Not seen grid missing');

      console.log('\n9. Checking Card Layout...');
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(500);
      
      const cards = await page.locator('#libraryGrid .show-card').count();
      console.log(`Found ${cards} cards in Watched tab`);
      
      if (cards > 0) {
        const firstCard = page.locator('#libraryGrid .show-card').first();
        const box = await firstCard.boundingBox();
        if (box) {
          console.log(`Card width: ${Math.round(box.width)}px`);
          console.log(box.width > 200 && box.width < 400 ? '✓ Card width in expected range' : '⚠ Card width unusual');
        }
      }

      console.log('\n10. Checking Subsection Titles...');
      await page.locator('.tab-btn[data-tab="newRatings"]').click();
      await page.waitForTimeout(500);
      
      const subsectionTitles = await page.locator('.subsection-title').allTextContents();
      console.log(`Subsection titles: ${subsectionTitles.map(t => t.trim()).join(', ')}`);
      
      if (subsectionTitles.length > 0) {
        // Check if titles are subtle (small, uppercase)
        const titleStyle = await page.locator('.subsection-title').first().evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            textTransform: style.textTransform,
            fontSize: parseFloat(style.fontSize)
          };
        });
        console.log(`Title style: ${titleStyle.textTransform}, ${titleStyle.fontSize}px`);
        console.log(titleStyle.textTransform === 'uppercase' && titleStyle.fontSize < 16 ? '✓ Titles are subtle' : '⚠ Title styling may differ');
      }

      // Take screenshot
      const screenshotName = `complete-verification-${viewport.width}px.png`;
      await page.screenshot({ path: `test-results/${screenshotName}`, fullPage: false });
      console.log(`\n📸 Screenshot saved: test-results/${screenshotName}`);

      console.log('\n=== Summary ===');
      console.log(`Console Errors: ${unexpectedErrors.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Page Title: ${title === 'VideoBuddy' ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Header Removed: ${header === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Tabs: ${tabs.length === 3 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Filter Panel: ${filterBtn > 0 ? 'PASS ✓' : 'FAIL ✗'}`);
      console.log(`Tab Switching: ${watchedActive && notSeenActive ? 'PASS ✓' : 'CHECK'}`);

      // Assertions
      expect(unexpectedErrors).toEqual([]);
      expect(title).toBe('VideoBuddy');
      expect(tabs.length).toBe(3);
    });
  }
});
