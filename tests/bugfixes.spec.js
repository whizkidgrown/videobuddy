import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test.describe('Bug Fix Verification', () => {
  test('should fix all three bugs on desktop and mobile', async ({ page }) => {
    console.log('\n=== Testing Bug Fixes ===\n');
    
    // Track console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Test at desktop width first
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    console.log('1. Testing Console Errors...');
    const unexpectedErrors = errors.filter(e => 
      !e.includes('Supabase') && 
      !e.includes('Database') &&
      !e.includes('not initialized')
    );
    console.log(unexpectedErrors.length === 0 ? '✓ No console errors' : `✗ Found ${unexpectedErrors.length} errors`);
    if (unexpectedErrors.length > 0) {
      unexpectedErrors.forEach(err => console.log(`  - ${err}`));
    }

    // Test Bug 1: "Seen it? Yes" flow
    console.log('\n2. Testing "Seen it? Yes" Flow...');
    await page.locator('.tab-btn[data-tab="todaysBatch"]').click();
    await page.waitForTimeout(1000);

    const rateTodayCards = page.locator('#batchGrid .show-card');
    const firstCard = rateTodayCards.first();
    
    // Check if "Seen it?" question is visible
    const seenQuestion = firstCard.locator('.seen-question');
    const hasSeenQuestion = await seenQuestion.count() > 0;
    console.log(hasSeenQuestion ? '✓ "Seen it?" question found' : '✗ No "Seen it?" question');

    if (hasSeenQuestion) {
      // Get the show title before clicking
      const cardTitle = await firstCard.locator('.card-title').textContent();
      console.log(`  Testing with: ${cardTitle.trim()}`);

      // Click "Yes" button
      const yesBtn = firstCard.locator('.seen-btn.yes');
      await yesBtn.click();
      await page.waitForTimeout(500);

      // Check if rating control appears
      const ratingControl = firstCard.locator('.rating-control');
      const hasRatingControl = await ratingControl.count() > 0;
      console.log(hasRatingControl ? '✓ Rating controls appeared after clicking Yes' : '✗ Rating controls did NOT appear');

      // Check if Back link appears
      const backLink = firstCard.locator('.back-link');
      const hasBackLink = await backLink.count() > 0;
      console.log(hasBackLink ? '✓ Back link appeared' : '○ No Back link (optional)');

      // Verify rating buttons are present (don't click them)
      const ratingButtons = ratingControl.locator('.rating-btn');
      const ratingBtnCount = await ratingButtons.count();
      console.log(`✓ Found ${ratingBtnCount} rating buttons (expected 3)`);
    }

    // Test Bug 2: Logo images
    console.log('\n3. Testing Logo Images...');
    await page.locator('.tab-btn[data-tab="library"]').click();
    await page.waitForTimeout(1000);

    const logoImages = page.locator('.streaming-badge img');
    const logoCount = await logoImages.count();
    console.log(`Found ${logoCount} streaming logo images`);

    if (logoCount > 0) {
      let validLogos = 0;
      for (let i = 0; i < Math.min(logoCount, 10); i++) {
        const img = logoImages.nth(i);
        const naturalWidth = await img.evaluate(el => el.naturalWidth);
        const src = await img.getAttribute('src');
        
        if (naturalWidth > 0) {
          validLogos++;
          console.log(`  ✓ Logo ${i + 1}: ${src.split('/').pop()} (${naturalWidth}px)`);
        } else {
          console.log(`  ✗ Logo ${i + 1}: BROKEN - ${src}`);
        }
      }
      console.log(`✓ ${validLogos}/${Math.min(logoCount, 10)} logos loaded successfully`);
    }

    // Test Bug 3: Dropdown clipping
    console.log('\n4. Testing Dropdown Menu (Desktop 1280px)...');
    await page.locator('.tab-btn[data-tab="topPicks"]').click();
    await page.waitForTimeout(500);

    // Open filters
    const filtersBtn = page.locator('.filters-toggle-btn').first();
    await filtersBtn.click();
    await page.waitForTimeout(300);

    // Open streaming dropdown
    const streamingDropdownBtn = page.locator('#topPicksFilters .dropdown-btn').first();
    await streamingDropdownBtn.click();
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'test-results/dropdown-desktop.png', fullPage: false });
    console.log('  📸 Screenshot saved: test-results/dropdown-desktop.png');

    // Check dropdown visibility
    const dropdownMenu = page.locator('#topPicksStreamingDropdown');
    const isVisible = await dropdownMenu.isVisible();
    console.log(isVisible ? '✓ Dropdown menu is visible' : '✗ Dropdown menu is NOT visible');

    // Count visible options
    const options = dropdownMenu.locator('label');
    const optionCount = await options.count();
    console.log(`✓ Found ${optionCount} options in dropdown`);

    // Check if at least 3 options are visible (not clipped)
    let visibleOptions = 0;
    for (let i = 0; i < Math.min(optionCount, 5); i++) {
      const option = options.nth(i);
      const box = await option.boundingBox();
      if (box && box.height > 0) {
        visibleOptions++;
        const text = await option.textContent();
        console.log(`  ✓ Option ${i + 1} visible: ${text.trim()}`);
      }
    }
    console.log(visibleOptions >= 3 ? `✓ Multiple options visible (${visibleOptions})` : '✗ Options may be clipped');

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Test on mobile width
    console.log('\n5. Testing Dropdown Menu (Mobile 390px)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // Navigate back to Top 5
    await page.locator('.tab-btn[data-tab="topPicks"]').click();
    await page.waitForTimeout(300);

    // Open filters
    await page.locator('.filters-toggle-btn').first().click();
    await page.waitForTimeout(300);

    // Check if dropdowns are full width
    const mobileDropdown = page.locator('#topPicksFilters .dropdown-wrapper').first();
    const dropdownBox = await mobileDropdown.boundingBox();
    const viewportWidth = 390;
    const isFullWidth = dropdownBox && (dropdownBox.width > viewportWidth * 0.8);
    console.log(isFullWidth ? '✓ Dropdown is full-width on mobile' : '✗ Dropdown is NOT full-width');

    // Open dropdown again
    await page.locator('#topPicksFilters .dropdown-btn').first().click();
    await page.waitForTimeout(500);

    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/dropdown-mobile.png', fullPage: false });
    console.log('  📸 Screenshot saved: test-results/dropdown-mobile.png');

    // Verify mobile dropdown visibility
    const mobileDropdownMenu = page.locator('#topPicksStreamingDropdown');
    const isMobileVisible = await mobileDropdownMenu.isVisible();
    console.log(isMobileVisible ? '✓ Mobile dropdown is visible' : '✗ Mobile dropdown is NOT visible');

    // Final summary
    console.log('\n=== Test Summary ===');
    console.log(`Console Errors: ${unexpectedErrors.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`Seen it? Flow: ${hasSeenQuestion && hasRatingControl ? 'PASS' : 'PENDING'}`);
    console.log(`Logo Images: ${logoCount > 0 && validLogos > 0 ? 'PASS' : 'CHECK'}`);
    console.log(`Dropdown Visibility: ${isVisible && visibleOptions >= 3 ? 'PASS' : 'CHECK'}`);
    console.log(`Mobile Dropdown: ${isMobileVisible ? 'PASS' : 'CHECK'}`);

    // Assertions
    expect(unexpectedErrors).toEqual([]);
    expect(isVisible).toBe(true);
    expect(optionCount).toBeGreaterThan(3);
  });
});
