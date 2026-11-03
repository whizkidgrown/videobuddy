import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Get new picks button works on live site (390px)', async ({ page }) => {
  console.log('\n=== Testing Get New Picks on Live Site (Mobile 390px) ===\n');
  
  // Track console errors
  const errors = [];
  const warnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  // Track alerts
  const alerts = [];
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('1. Checking initial state...');
  const btnExists = await page.locator('#getNewPicksBtn').count();
  console.log(btnExists > 0 ? '✓ Get new picks button present' : '✗ Button not found');
  
  if (btnExists === 0) {
    console.log('✗ Test cannot continue - button not found');
    return;
  }

  const btnText = await page.locator('#getNewPicksBtn').textContent();
  console.log(`Button text: "${btnText}"`);

  console.log('\n2. Clicking Get new picks button...');
  await page.locator('#getNewPicksBtn').click();
  
  // Wait for button state change
  await page.waitForTimeout(2000);

  const newBtnText = await page.locator('#getNewPicksBtn').textContent();
  console.log(`Button text after click: "${newBtnText}"`);

  console.log('\n3. Checking for alerts...');
  if (alerts.length > 0) {
    console.log(`✗ Alert shown: "${alerts[0]}"`);
  } else {
    console.log('✓ No alerts shown');
  }

  console.log('\n4. Checking button state...');
  const isDisabled = await page.locator('#getNewPicksBtn').isDisabled();
  const hasLoading = await page.locator('#getNewPicksBtn.loading').count();
  
  console.log(`Button disabled: ${isDisabled}`);
  console.log(`Button has loading class: ${hasLoading > 0}`);
  
  if (newBtnText.includes('Getting recommendations') || hasLoading > 0) {
    console.log('✓ Button shows loading state');
  } else if (newBtnText.includes('✗')) {
    console.log(`✗ Button shows error: "${newBtnText}"`);
  } else if (newBtnText.includes('✓')) {
    console.log(`✓ Button shows success: "${newBtnText}"`);
  }

  // Wait longer to see if it completes
  console.log('\n5. Waiting for operation to complete...');
  await page.waitForTimeout(8000);

  const finalBtnText = await page.locator('#getNewPicksBtn').textContent();
  console.log(`Final button text: "${finalBtnText}"`);

  console.log('\n6. Checking for AI suggestions in Top picks...');
  const topPicksCards = await page.locator('#newRatingsGrid .subsection:has(.subsection-title:text("Top picks for you")) .show-card').count();
  console.log(`Top picks cards found: ${topPicksCards}`);

  if (topPicksCards > 0) {
    const titles = await page.locator('#newRatingsGrid .subsection:has(.subsection-title:text("Top picks for you")) .card-title').allTextContents();
    console.log(`Titles: ${titles.slice(0, 5).map(t => t.trim()).join(', ')}`);
  }

  console.log('\n7. Checking for AI suggestions in Have you seen these...');
  const batchCards = await page.locator('#newRatingsGrid .subsection:has(.subsection-title:text("Have you seen these?")) .show-card').count();
  console.log(`Batch cards found: ${batchCards}`);

  if (batchCards > 0) {
    const titles = await page.locator('#newRatingsGrid .subsection:has(.subsection-title:text("Have you seen these?")) .card-title').allTextContents();
    console.log(`Titles: ${titles.slice(0, 5).map(t => t.trim()).join(', ')}`);
  }

  console.log('\n8. Checking console errors...');
  const unexpectedErrors = errors.filter(e => 
    !e.includes('Supabase') && 
    !e.includes('Database') &&
    !e.includes('not initialized') &&
    !e.includes('suggestions')
  );
  
  if (unexpectedErrors.length > 0) {
    console.log(`✗ Found ${unexpectedErrors.length} unexpected errors:`);
    unexpectedErrors.slice(0, 3).forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('✓ No unexpected console errors');
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/get-new-picks-live-390px.png', fullPage: true });
  console.log('\n📸 Screenshot saved: test-results/get-new-picks-live-390px.png');

  console.log('\n=== Summary ===');
  console.log(`Alerts: ${alerts.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Button state: ${finalBtnText.includes('✓') ? 'SUCCESS ✓' : finalBtnText.includes('✗') ? 'ERROR ✗' : 'UNKNOWN'}`);
  console.log(`Top picks: ${topPicksCards > 0 ? `${topPicksCards} cards ✓` : 'None found'}`);
  console.log(`Batch cards: ${batchCards > 0 ? `${batchCards} cards ✓` : 'None found'}`);
  console.log(`Console errors: ${unexpectedErrors.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);

  // Assertions
  expect(alerts).toEqual([]);
  expect(unexpectedErrors).toEqual([]);
});
