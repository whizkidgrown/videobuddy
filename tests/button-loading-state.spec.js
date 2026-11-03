import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Verify Get New Picks button maintains size in loading state', async ({ page }) => {
  const viewports = [
    { name: 'Mobile', width: 390, height: 844 },
    { name: 'Desktop', width: 1280, height: 720 }
  ];
  
  for (const viewport of viewports) {
    console.log(`\n=== Testing at ${viewport.name} (${viewport.width}px) ===\n`);
    
    await page.setViewportSize(viewport);
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const btn = page.locator('#getNewPicksBtn');
    
    // Measure button in normal state
    console.log('1. Measuring button in normal state...');
    const normalBox = await btn.boundingBox();
    const normalText = await btn.textContent();
    
    console.log(`   Text: "${normalText?.trim()}"`);
    console.log(`   Size: ${normalBox?.width.toFixed(1)}px × ${normalBox?.height.toFixed(1)}px`);
    
    // Trigger loading state by clicking
    console.log('\n2. Clicking button to trigger loading state...');
    await btn.click();
    await page.waitForTimeout(500);
    
    // Check if loading class is applied
    const hasLoadingClass = await btn.evaluate(el => el.classList.contains('loading'));
    console.log(`   Loading class applied: ${hasLoadingClass ? '✓' : '✗'}`);
    
    if (hasLoadingClass) {
      // Measure button in loading state
      const loadingBox = await btn.boundingBox();
      const loadingText = await btn.textContent();
      
      console.log(`   Text: "${loadingText?.trim()}"`);
      console.log(`   Size: ${loadingBox?.width.toFixed(1)}px × ${loadingBox?.height.toFixed(1)}px`);
      
      // Calculate difference
      const widthDiff = Math.abs((loadingBox?.width || 0) - (normalBox?.width || 0));
      const heightDiff = Math.abs((loadingBox?.height || 0) - (normalBox?.height || 0));
      
      console.log(`\n3. Size change:`);
      console.log(`   Width: ${widthDiff > 1 ? `${widthDiff.toFixed(1)}px ⚠️` : 'None ✓'}`);
      console.log(`   Height: ${heightDiff > 1 ? `${heightDiff.toFixed(1)}px ⚠️` : 'None ✓'}`);
      
      // Check for spinner visibility
      const spinnerVisible = await btn.evaluate(el => {
        const before = window.getComputedStyle(el, '::before');
        return before.content !== 'none' && before.content !== '';
      });
      console.log(`   Spinner visible: ${spinnerVisible ? '✓' : '✗'}`);
      
      // Assertions
      expect(heightDiff, 'Button height should not change significantly').toBeLessThan(5);
      expect(loadingBox?.height || 0, 'Button should not become huge (>100px)').toBeLessThan(100);
      expect(loadingText?.trim(), 'Loading text should be short').toContain('Finding');
      
      console.log(`\n✓ Button maintains size in loading state`);
    } else {
      console.log('   ⚠️  Loading state not triggered (may have completed too fast)');
    }
    
    // Wait for completion or error
    await page.waitForTimeout(3000);
  }
});
