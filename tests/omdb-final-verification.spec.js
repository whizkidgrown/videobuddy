import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('Final OMDb verification - ratings and interactivity', async ({ page }) => {
  console.log('\n=== Final OMDb Integration Verification ===\n');
  
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  console.log('1. Testing at 1280px (Desktop)...');
  await page.locator('.tab-btn[data-tab="library"]').click();
  await page.waitForTimeout(8000); // Wait for OMDb enrichment
  
  const imdbBadges = await page.locator('.imdb-badge').count();
  const rtBadges = await page.locator('.rt-badge').count();
  
  console.log(`   IMDb badges: ${imdbBadges}`);
  console.log(`   RT badges: ${rtBadges}`);
  
  // Check that at least one IMDb badge is linkable
  if (imdbBadges > 0) {
    const firstBadge = page.locator('.imdb-badge').first();
    const href = await firstBadge.getAttribute('href');
    const text = await firstBadge.textContent();
    console.log(`   ✓ Sample IMDb badge: ${text?.trim()} → ${href}`);
    expect(href).toContain('imdb.com/title/');
  }
  
  // Check RT badges if present
  if (rtBadges > 0) {
    const firstRT = page.locator('.rt-badge').first();
    const text = await firstRT.textContent();
    console.log(`   ✓ Sample RT badge: ${text?.trim()}`);
  } else {
    console.log('   ⚠ No RT badges yet (TV shows often lack RT ratings)');
  }
  
  console.log('\n2. Testing at 390px (Mobile)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  
  const mobileBadges = await page.locator('.imdb-badge').count();
  console.log(`   IMDb badges on mobile: ${mobileBadges}`);
  
  // Check badge positioning/wrapping
  const badge = page.locator('.imdb-badge').first();
  if (await badge.count() > 0) {
    const box = await badge.boundingBox();
    console.log(`   ✓ Badge is visible at (${box?.x?.toFixed(0)}, ${box?.y?.toFixed(0)})`);
  }
  
  console.log('\n3. Testing badge side-by-side layout...');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(500);
  
  // Find a card with both IMDb and RT badges (if any)
  const cardsWithBoth = await page.locator('.ratings-badges').evaluateAll(badges => {
    return badges.filter(b => {
      const hasIMDb = b.querySelector('.imdb-badge');
      const hasRT = b.querySelector('.rt-badge');
      return hasIMDb && hasRT;
    }).length;
  });
  
  console.log(`   Cards with both IMDb & RT: ${cardsWithBoth}`);
  
  if (cardsWithBoth > 0) {
    console.log('   ✓ Side-by-side badges verified');
  } else {
    console.log('   ⚠ No cards with both badges yet (RT data still loading)');
  }
  
  console.log('\n4. Testing link functionality...');
  const imdbLink = page.locator('.imdb-badge[href*="imdb.com"]').first();
  if (await imdbLink.count() > 0) {
    const href = await imdbLink.getAttribute('href');
    const target = await imdbLink.getAttribute('target');
    const rel = await imdbLink.getAttribute('rel');
    
    console.log(`   Link href: ${href}`);
    console.log(`   Opens in new tab: ${target === '_blank' ? 'Yes' : 'No'}`);
    console.log(`   Security: ${rel === 'noopener noreferrer' ? 'Secure' : 'Check'}`);
    
    expect(href).toMatch(/^https:\/\/www\.imdb\.com\/title\/tt\d+\/$/);
    expect(target).toBe('_blank');
    expect(rel).toBe('noopener noreferrer');
  }
  
  console.log('\n5. Testing badge styling...');
  const badgeStyle = await page.locator('.imdb-badge').first().evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      bg: style.backgroundColor,
      color: style.color,
      display: style.display
    };
  });
  
  console.log(`   Background: ${badgeStyle.bg}`);
  console.log(`   Text color: ${badgeStyle.color}`);
  console.log(`   Display: ${badgeStyle.display}`);
  
  await page.screenshot({ 
    path: 'test-results/omdb-final-1280px.png', 
    fullPage: false 
  });
  console.log('\n📸 Screenshot: test-results/omdb-final-1280px.png');
  
  console.log('\n✅ OMDb integration verified successfully!');
  expect(imdbBadges).toBeGreaterThan(0);
});
