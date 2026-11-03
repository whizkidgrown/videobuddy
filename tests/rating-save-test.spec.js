import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Verify rating save on AI suggestion card', async ({ page }) => {
  console.log('\n=== Testing Rating Save on AI Suggestion ===\n');
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  
  console.log('1. Opening New Ratings tab...');
  await page.locator('.tab-btn[data-tab="newRatings"]').click();
  await page.waitForTimeout(1000);
  
  console.log('2. Finding first AI suggestion card in "Top picks for you"...');
  const firstCard = page.locator('#newRatingsGrid .show-card').first();
  const title = await firstCard.getAttribute('data-title');
  console.log(`   Target card: "${title}"`);
  
  // Check if card has rating control visible
  const ratingControl = firstCard.locator('.rating-control');
  const hasRatingControl = await ratingControl.count() > 0;
  
  if (!hasRatingControl) {
    console.log('   Card shows "Seen it?" question first...');
    const yesBtn = firstCard.locator('button:has-text("Yes")');
    if (await yesBtn.count() > 0) {
      console.log('   Clicking "Yes" to show rating control...');
      await yesBtn.click();
      await page.waitForTimeout(500);
    }
  }
  
  console.log('3. Rating the card as "loved"...');
  const lovedBtn = firstCard.locator('.rating-btn[data-rating="loved"]');
  await lovedBtn.click();
  await page.waitForTimeout(2000);
  
  console.log('4. Checking for error toast...');
  const errorToast = page.locator('.error-toast');
  const hasError = await errorToast.count() > 0;
  
  if (hasError) {
    const errorText = await errorToast.textContent();
    console.log(`   ✗ ERROR TOAST SHOWN: ${errorText}`);
    throw new Error('Rating save failed with error toast');
  } else {
    console.log('   ✓ No error toast (save succeeded)');
  }
  
  console.log('5. Verifying card moved to Watched tab...');
  await page.locator('.tab-btn[data-tab="library"]').click();
  await page.waitForTimeout(1000);
  
  const cardInWatched = page.locator(`#libraryGrid .show-card[data-title="${title}"]`);
  const isInWatched = await cardInWatched.count() > 0;
  
  if (isInWatched) {
    console.log(`   ✓ Card "${title}" found in Watched tab`);
  } else {
    console.log(`   ✗ Card "${title}" NOT in Watched tab`);
    throw new Error('Card did not move to Watched after rating');
  }
  
  console.log('6. Refreshing page to verify persistence...');
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  
  await page.locator('.tab-btn[data-tab="library"]').click();
  await page.waitForTimeout(1000);
  
  const cardAfterRefresh = page.locator(`#libraryGrid .show-card[data-title="${title}"]`);
  const stillInWatched = await cardAfterRefresh.count() > 0;
  
  if (stillInWatched) {
    console.log(`   ✓ Card "${title}" still in Watched after refresh`);
    
    // Check if it has the "loved" rating
    const lovedBtnActive = cardAfterRefresh.locator('.rating-btn[data-rating="loved"].active');
    const hasLovedRating = await lovedBtnActive.count() > 0;
    
    if (hasLovedRating) {
      console.log('   ✓ Rating "loved" persisted');
    } else {
      console.log('   ✗ Rating not persisted correctly');
    }
  } else {
    console.log(`   ✗ Card disappeared after refresh`);
  }
  
  console.log('\n✅ Test completed successfully!');
  console.log(`\nNOTE: Test card "${title}" was rated as "loved" and saved to database.`);
  console.log('Please delete this test row from Supabase ratings table.');
  
  expect(hasError).toBe(false);
  expect(isInWatched).toBe(true);
  expect(stillInWatched).toBe(true);
});
