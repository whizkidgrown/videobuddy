import { test } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Visual test: button in normal and loading states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  const btn = page.locator('#getNewPicksBtn');
  
  console.log('\n=== Button Visual Test at 390px ===\n');
  
  // Screenshot 1: Normal state
  await btn.screenshot({ path: 'test-results/button-normal-390px.png' });
  console.log('✓ Captured: button-normal-390px.png');
  
  // Get computed styles
  const normalStyles = await btn.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      width: computed.width,
      height: computed.height,
      padding: computed.padding,
      lineHeight: computed.lineHeight,
      fontSize: computed.fontSize,
      display: computed.display
    };
  });
  console.log('Normal state styles:', normalStyles);
  
  // Trigger loading
  await btn.click();
  await page.waitForTimeout(500);
  
  // Screenshot 2: Loading state
  await btn.screenshot({ path: 'test-results/button-loading-390px.png' });
  console.log('✓ Captured: button-loading-390px.png');
  
  // Get computed styles in loading state
  const loadingStyles = await btn.evaluate(el => {
    const computed = window.getComputedStyle(el);
    const before = window.getComputedStyle(el, '::before');
    return {
      width: computed.width,
      height: computed.height,
      maxHeight: computed.maxHeight,
      minHeight: computed.minHeight,
      padding: computed.padding,
      lineHeight: computed.lineHeight,
      overflow: computed.overflow,
      boxSizing: computed.boxSizing,
      beforeDisplay: before.display,
      beforeWidth: before.width,
      beforeHeight: before.height
    };
  });
  console.log('Loading state styles:', loadingStyles);
  
  console.log('\n✓ Visual test complete - check test-results/ for screenshots');
});
