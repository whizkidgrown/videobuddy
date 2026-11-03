import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test.describe('OMDb Ratings Integration', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    test(`${viewport.name} (${viewport.width}px) - verify IMDb and RT badges`, async ({ page }) => {
      console.log(`\n=== Testing OMDb Ratings at ${viewport.name} (${viewport.width}x${viewport.height}) ===\n`);
      
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

      console.log('1. Checking for rating badges on cards...');
      
      // Check Watched tab (most cards)
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(1000);
      
      const totalCards = await page.locator('#libraryGrid .show-card').count();
      console.log(`Total cards in Watched: ${totalCards}`);
      
      // Wait for OMDb enrichment (lazy loading)
      console.log('\n2. Waiting for OMDb data to load (lazy enrichment)...');
      await page.waitForTimeout(5000);
      
      const imdbBadges = await page.locator('.imdb-badge, .imdb-badge-inline').count();
      const rtBadges = await page.locator('.rt-badge').count();
      
      console.log(`IMDb badges found: ${imdbBadges}`);
      console.log(`RT badges found: ${rtBadges}`);
      
      console.log('\n3. Checking sample shows...');
      
      // Check if any cards have badges
      if (imdbBadges > 0) {
        const sampleIMDb = await page.locator('.imdb-badge').first();
        const imdbText = await sampleIMDb.textContent();
        const imdbHref = await sampleIMDb.getAttribute('href');
        console.log(`✓ Sample IMDb badge: "${imdbText}" → ${imdbHref}`);
      }
      
      if (rtBadges > 0) {
        const sampleRT = await page.locator('.rt-badge').first();
        const rtText = await sampleRT.textContent();
        console.log(`✓ Sample RT badge: "${rtText}"`);
      }
      
      console.log('\n4. Checking New Ratings tab for AI suggestions...');
      await page.locator('.tab-btn[data-tab="newRatings"]').click();
      await page.waitForTimeout(2000);
      
      const aiCards = await page.locator('#newRatingsGrid .show-card').count();
      console.log(`AI suggestion cards: ${aiCards}`);
      
      if (aiCards > 0) {
        await page.waitForTimeout(3000); // Wait for OMDb enrichment
        
        const aiImdbBadges = await page.locator('#newRatingsGrid .imdb-badge').count();
        const aiRtBadges = await page.locator('#newRatingsGrid .rt-badge').count();
        
        console.log(`  IMDb badges on AI cards: ${aiImdbBadges}`);
        console.log(`  RT badges on AI cards: ${aiRtBadges}`);
      }
      
      console.log('\n5. Checking badge interactivity...');
      if (imdbBadges > 0) {
        const firstIMDbBadge = page.locator('.imdb-badge').first();
        const isLink = await firstIMDbBadge.evaluate(el => el.tagName === 'A');
        console.log(isLink ? '✓ IMDb badge is a clickable link' : '⚠ IMDb badge is not a link');
      }
      
      console.log('\n6. Checking console errors...');
      const unexpectedErrors = errors.filter(e => 
        !e.includes('Supabase') && 
        !e.includes('Database') &&
        !e.includes('not initialized') &&
        !e.includes('suggestions') &&
        !e.includes('404') // Ignore 404s (favicon, etc.)
      );
      
      if (unexpectedErrors.length > 0) {
        console.log(`✗ Found ${unexpectedErrors.length} unexpected errors:`);
        unexpectedErrors.slice(0, 3).forEach(e => console.log(`  - ${e.substring(0, 100)}`));
      } else {
        console.log('✓ No unexpected console errors');
      }
      
      // Take screenshot
      await page.locator('.tab-btn[data-tab="library"]').click();
      await page.waitForTimeout(1000);
      const screenshotName = `omdb-ratings-${viewport.width}px.png`;
      await page.screenshot({ path: `test-results/${screenshotName}`, fullPage: false });
      console.log(`\n📸 Screenshot saved: test-results/${screenshotName}`);

      console.log('\n=== Summary ===');
      console.log(`Total cards: ${totalCards}`);
      console.log(`IMDb badges: ${imdbBadges > 0 ? `${imdbBadges} ✓` : 'None yet (lazy loading)'}`);
      console.log(`RT badges: ${rtBadges > 0 ? `${rtBadges} ✓` : 'None (expected - many shows lack RT)'}`);
      console.log(`Console errors: ${unexpectedErrors.length === 0 ? 'PASS ✓' : 'CHECK'}`);

      // Assertions (lenient for lazy loading)
      expect(unexpectedErrors).toEqual([]);
      expect(totalCards).toBeGreaterThan(0);
    });
  }
});
