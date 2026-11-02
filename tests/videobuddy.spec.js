import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8000';

test.describe('VideoBuddy Tests', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Mobile', width: 390, height: 844 }
  ];

  for (const viewport of viewports) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('should load without console errors', async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        await page.goto(BASE_URL);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForFunction(() => window.data !== null && window.data !== undefined, { timeout: 10000 });
        await page.waitForSelector('.show-card', { timeout: 10000 });
        
        expect(errors.filter(e => !e.includes('Supabase not configured'))).toEqual([]);
      });

      test('should switch between tabs', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForFunction(() => window.data !== null, { timeout: 10000 });
        await page.waitForSelector('.show-card', { timeout: 10000 });

        // Check initial tab is active
        const topPicksTab = page.locator('.tab-btn[data-tab="topPicks"]');
        await expect(topPicksTab).toHaveClass(/active/);
        await expect(page.locator('#topPicks')).toHaveClass(/active/);

        // Switch to Rate Today tab
        const rateTodayTab = page.locator('.tab-btn[data-tab="todaysBatch"]');
        await rateTodayTab.click();
        await expect(rateTodayTab).toHaveClass(/active/);
        await expect(page.locator('#todaysBatch')).toHaveClass(/active/);
        await expect(page.locator('#topPicks')).not.toHaveClass(/active/);

        // Switch to Watched tab
        const watchedTab = page.locator('.tab-btn[data-tab="library"]');
        await watchedTab.click();
        await expect(watchedTab).toHaveClass(/active/);
        await expect(page.locator('#library')).toHaveClass(/active/);
        await expect(page.locator('#todaysBatch')).not.toHaveClass(/active/);
      });

      test('should open and close filters', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForFunction(() => window.data !== null, { timeout: 10000 });
        await page.waitForSelector('.show-card', { timeout: 10000 });

        // Initially collapsed
        const filtersPanel = page.locator('#topPicksFilters');
        await expect(filtersPanel).toHaveClass(/collapsed/);

        // Open filters
        const filtersButton = page.locator('.filters-toggle-btn').first();
        await filtersButton.click();
        await expect(filtersPanel).not.toHaveClass(/collapsed/);

        // Close filters
        await filtersButton.click();
        await expect(filtersPanel).toHaveClass(/collapsed/);
      });

      test('should check and uncheck filters', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForFunction(() => window.data !== null, { timeout: 10000 });
        await page.waitForSelector('.show-card', { timeout: 10000 });

        // Open filters
        const filtersButton = page.locator('.filters-toggle-btn').first();
        await filtersButton.click();

        // Open streaming dropdown
        const streamingDropdownBtn = page.locator('.dropdown-btn').first();
        await streamingDropdownBtn.click();

        // Check first streaming service checkbox
        const firstCheckbox = page.locator('#topPicksStreamingOptions input[type="checkbox"]').first();
        await firstCheckbox.check();
        await expect(firstCheckbox).toBeChecked();

        // Filter badge should show count
        const filterBadge = page.locator('#topPicksFilterCount');
        await expect(filterBadge).not.toBeEmpty();

        // Filter chip should appear
        const filterChips = page.locator('#topPicksFilterChips .filter-chip');
        await expect(filterChips).toHaveCount(1);

        // Uncheck the checkbox
        await streamingDropdownBtn.click();
        await firstCheckbox.uncheck();
        await expect(firstCheckbox).not.toBeChecked();

        // Filter badge should be empty
        await expect(filterBadge).toBeEmpty();
      });

      test('should persist rating change after reload', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForFunction(() => window.data !== null, { timeout: 10000 });
        await page.waitForSelector('.show-card', { timeout: 10000 });

        // Go to Rate Today tab to find an unrated show
        await page.locator('.tab-btn[data-tab="todaysBatch"]').click();
        await page.waitForSelector('#batchGrid .show-card', { timeout: 10000 });

        // Find first show with rating control
        const firstCard = page.locator('#batchGrid .show-card').first();
        const showTitle = await firstCard.getAttribute('data-title');
        
        // Store original rating from localStorage if any
        const originalRatings = await page.evaluate(() => {
          const saved = localStorage.getItem('hemantTVRatings');
          return saved ? JSON.parse(saved).ratings : {};
        });
        const originalRating = originalRatings[showTitle];

        // Click "Loved" button
        const lovedBtn = firstCard.locator('.rating-btn').first();
        await lovedBtn.click();
        await expect(lovedBtn).toHaveClass(/active/);

        // Wait a bit for the update to settle
        await page.waitForTimeout(500);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Go to Watched tab (rated shows move there)
        await page.locator('.tab-btn[data-tab="library"]').click();
        await page.waitForSelector('#libraryGrid', { timeout: 5000 });

        // Find the card we rated
        const ratedCard = page.locator(`#libraryGrid .show-card[data-title="${showTitle}"]`);
        
        // Check if rating persisted
        const ratedLovedBtn = ratedCard.locator('.rating-btn').first();
        await expect(ratedLovedBtn).toHaveClass(/active/);

        // Restore original rating
        await page.evaluate((data) => {
          const saved = localStorage.getItem('hemantTVRatings');
          const parsed = saved ? JSON.parse(saved) : { ratings: {}, statuses: {} };
          
          if (data.originalRating) {
            parsed.ratings[data.showTitle] = data.originalRating;
          } else {
            delete parsed.ratings[data.showTitle];
          }
          
          // Remove the auto-set "Watched" status if there was no original rating
          if (!data.originalRating) {
            delete parsed.statuses[data.showTitle];
          }
          
          localStorage.setItem('hemantTVRatings', JSON.stringify(parsed));
        }, { showTitle, originalRating });

        // Reload to verify restoration
        await page.reload();
        await page.waitForLoadState('networkidle');
      });
    });
  }
});
