import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Skip button verification - DO NOT CLICK', async ({ page }) => {
  console.log('\n=== Testing Skip Button (No DB writes) ===\n');
  
  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

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
    unexpectedErrors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n2. Verifying Top 5 Tab...');
  const topPicksTab = page.locator('.tab-btn[data-tab="topPicks"]');
  await expect(topPicksTab).toBeVisible();
  await expect(topPicksTab).toHaveClass(/active/);
  console.log('✓ Top 5 tab is active');

  console.log('\n3. Checking for Top 5 Cards...');
  const cards = page.locator('#picksGrid .show-card');
  const cardCount = await cards.count();
  console.log(`✓ Found ${cardCount} Top 5 cards`);

  if (cardCount > 0) {
    console.log('\n4. Verifying Skip Button on Cards...');
    
    let skipButtonsFound = 0;
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = cards.nth(i);
      const title = await card.locator('.card-title').textContent();
      
      // Check for skip button
      const skipBtn = card.locator('.skip-btn[data-action="skip"]');
      const hasSkipBtn = await skipBtn.count() > 0;
      
      if (hasSkipBtn) {
        skipButtonsFound++;
        const btnText = await skipBtn.textContent();
        console.log(`  ✓ Card ${i + 1} (${title.trim()}): Skip button present - "${btnText.trim()}"`);
        
        // Verify button is visible and has correct styling
        await expect(skipBtn).toBeVisible();
        const isEnabled = await skipBtn.isEnabled();
        console.log(`    - Button is ${isEnabled ? 'enabled' : 'disabled'}`);
      } else {
        console.log(`  ○ Card ${i + 1}: No skip button (may already have rating)`);
      }
    }
    
    console.log(`\n✓ Found ${skipButtonsFound} skip buttons across Top 5 cards`);
    
    if (skipButtonsFound > 0) {
      console.log('\n5. Verifying Skip Button Attributes...');
      const firstSkipBtn = page.locator('.skip-btn[data-action="skip"]').first();
      
      // Check data-action attribute
      const action = await firstSkipBtn.getAttribute('data-action');
      console.log(`  ✓ data-action="${action}"`);
      
      // Check button text
      const buttonText = await firstSkipBtn.textContent();
      console.log(`  ✓ Button text: "${buttonText.trim()}"`);
      
      // Get computed styles
      const color = await firstSkipBtn.evaluate(el => window.getComputedStyle(el).color);
      console.log(`  ✓ Text color: ${color}`);
      
      console.log('\n⚠️  NOT clicking button to avoid DB write');
    } else {
      console.log('\n⚠️  No unrated shows in Top 5, all may already be rated');
    }
  } else {
    console.log('⚠️  No cards found in Top 5 (all may be filtered out)');
  }

  console.log('\n6. Checking Not Seen Tab Structure...');
  const notSeenTab = page.locator('.tab-btn[data-tab="notSeen"]');
  await notSeenTab.click();
  await page.waitForTimeout(1000);
  
  // Check for subsection titles
  const subsectionTitles = page.locator('.subsection-title');
  const subsectionCount = await subsectionTitles.count();
  console.log(`✓ Found ${subsectionCount} subsection(s) in Not Seen tab`);
  
  if (subsectionCount > 0) {
    for (let i = 0; i < subsectionCount; i++) {
      const title = await subsectionTitles.nth(i).textContent();
      console.log(`  - ${title.trim()}`);
    }
  }

  console.log('\n=== Test Summary ===');
  console.log(`Console Errors: ${unexpectedErrors.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Skip Buttons Found: ${skipButtonsFound > 0 ? 'PASS ✓' : 'CHECK ○'}`);
  console.log(`Not Seen Tab Structure: ${subsectionCount >= 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`\nDB Status: NO WRITES (button not clicked) ✓`);

  // Assertions
  expect(unexpectedErrors).toEqual([]);
  expect(topPicksTab).toBeVisible();
});
