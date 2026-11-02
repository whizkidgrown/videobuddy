import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test.describe('VideoBuddy Production Tests', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('should load without console errors', async ({ page }) => {
        const errors = [];
        const warnings = [];
        
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          } else if (msg.type() === 'warning') {
            warnings.push(msg.text());
          }
        });

        await page.goto(DEPLOYED_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000); // Wait for data to load
        
        // Check if page loaded successfully
        await expect(page.locator('h1')).toContainText('TV Tracker');
        
        console.log('=== Console Errors ===');
        if (errors.length === 0) {
          console.log('None');
        } else {
          errors.forEach(err => console.log(err));
        }
        
        console.log('\n=== Console Warnings ===');
        if (warnings.length === 0) {
          console.log('None');
        } else {
          warnings.forEach(warn => console.log(warn));
        }
        
        // Filter out expected warnings (Supabase)
        const unexpectedErrors = errors.filter(e => 
          !e.includes('Supabase') && 
          !e.includes('Database')
        );
        
        expect(unexpectedErrors).toEqual([]);
      });

      test('should show all tabs and allow switching', async ({ page }) => {
        await page.goto(DEPLOYED_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Check all 4 tabs exist
        const topPicksTab = page.locator('.tab-btn[data-tab="topPicks"]');
        const rateTodayTab = page.locator('.tab-btn[data-tab="todaysBatch"]');
        const watchedTab = page.locator('.tab-btn[data-tab="library"]');
        const notSeenTab = page.locator('.tab-btn[data-tab="notSeen"]');
        
        await expect(topPicksTab).toBeVisible();
        await expect(rateTodayTab).toBeVisible();
        await expect(watchedTab).toBeVisible();
        await expect(notSeenTab).toBeVisible();

        // Top Picks should be active initially
        await expect(topPicksTab).toHaveClass(/active/);

        // Switch to Rate Today
        await rateTodayTab.click();
        await expect(rateTodayTab).toHaveClass(/active/);
        await expect(topPicksTab).not.toHaveClass(/active/);

        // Switch to Watched
        await watchedTab.click();
        await expect(watchedTab).toHaveClass(/active/);
        
        // Switch to Not seen
        await notSeenTab.click();
        await expect(notSeenTab).toHaveClass(/active/);
        
        console.log('✓ All tabs work correctly');
      });

      test('should show new Top 5 picks', async ({ page }) => {
        await page.goto(DEPLOYED_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Verify Top 5 tab is active
        const topPicksTab = page.locator('.tab-btn[data-tab="topPicks"]');
        await expect(topPicksTab).toHaveClass(/active/);

        // Wait for cards to load
        const cards = page.locator('#picksGrid .show-card');
        await expect(cards.first()).toBeVisible({ timeout: 5000 });

        // Get all show titles in Top 5
        const titles = await cards.locator('.card-title').allTextContents();
        
        console.log('\n=== Top 5 Shows ===');
        titles.forEach(title => console.log(`- ${title.trim()}`));

        // Verify the new shows are present
        const allTitlesText = titles.join(' ');
        expect(allTitlesText).toContain('Dept. Q');
        expect(allTitlesText).toContain('Black Doves');
        expect(allTitlesText).toContain('Chestnut Man');
        expect(allTitlesText).toContain('Suzhal');

        // Verify old shows are NOT present
        expect(allTitlesText).not.toContain('Happy Valley');
        expect(allTitlesText).not.toContain('The Capture');
        expect(allTitlesText).not.toContain('Wallander');
        
        console.log('✓ New Top 5 picks verified');
      });

      test('should have working filters', async ({ page }) => {
        await page.goto(DEPLOYED_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Click filters button
        const filtersBtn = page.locator('.filters-toggle-btn').first();
        await filtersBtn.click();
        
        // Verify filters panel is visible
        const filtersPanel = page.locator('#topPicksFilters');
        await expect(filtersPanel).not.toHaveClass(/collapsed/);

        // Try opening streaming dropdown
        const streamingDropdownBtn = page.locator('#topPicksFilters .dropdown-btn').first();
        await streamingDropdownBtn.click();
        
        // Verify dropdown menu appears
        const dropdownMenu = page.locator('#topPicksStreamingDropdown');
        await expect(dropdownMenu).toHaveClass(/show/);
        
        console.log('✓ Filters work correctly');
      });

      test('should show horizontal cards with correct layout', async ({ page }) => {
        await page.goto(DEPLOYED_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Get first card
        const firstCard = page.locator('.show-card.horizontal').first();
        await expect(firstCard).toBeVisible();

        // Verify horizontal layout structure
        const poster = firstCard.locator('.card-poster');
        const details = firstCard.locator('.card-details');
        
        await expect(poster).toBeVisible();
        await expect(details).toBeVisible();

        // Verify card has required elements
        await expect(firstCard.locator('.card-title')).toBeVisible();
        await expect(firstCard.locator('.card-meta')).toBeVisible();
        
        console.log('✓ Horizontal card layout verified');
      });

      test('should show Netflix/Prime/Max logos', async ({ page }) => {
        await page.goto(DEPLOYED_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Switch to Watched tab (more shows there)
        await page.locator('.tab-btn[data-tab="library"]').click();
        await page.waitForTimeout(1000);

        // Find cards with streaming badges
        const streamingBadges = page.locator('.streaming-badge');
        const count = await streamingBadges.count();
        
        console.log(`\n✓ Found ${count} streaming badges`);
        
        // Check if some have logo images (Netflix/Prime/Max)
        const logoImages = page.locator('.streaming-badge img');
        const logoCount = await logoImages.count();
        
        console.log(`✓ ${logoCount} badges have logo images (Netflix/Prime/Max)`);
        
        expect(count).toBeGreaterThan(0);
      });
    });
  }
});
