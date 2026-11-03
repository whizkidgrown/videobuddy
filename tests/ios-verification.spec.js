import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://whizkidgrown.github.io/videobuddy/';

test('iOS verification - posters and ratings at 390px', async ({ page }) => {
  console.log('\n=== iOS Verification at 390px ===\n');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEPLOYED_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  
  const tabs = [
    { name: 'New Ratings', id: 'newRatings' },
    { name: 'Watched', id: 'library' },
    { name: 'Not Seen', id: 'notSeen' }
  ];
  
  const results = {};
  
  for (const tab of tabs) {
    console.log(`\n--- ${tab.name} Tab ---`);
    await page.locator(`.tab-btn[data-tab="${tab.id}"]`).click();
    await page.waitForTimeout(2000);
    
    const gridId = tab.id === 'newRatings' ? '#newRatingsGrid' : 
                   tab.id === 'library' ? '#libraryGrid' : '#notSeenGrid';
    
    const cards = page.locator(`${gridId} .show-card`);
    const totalCards = await cards.count();
    
    if (totalCards === 0) {
      console.log('  No cards found on this tab');
      results[tab.name] = { total: 0, withImage: 0, withRating: 0, missingImage: [], missingRating: [] };
      continue;
    }
    
    console.log(`  Total cards: ${totalCards}`);
    
    let cardsWithImage = 0;
    let cardsWithRating = 0;
    const missingImage = [];
    const missingRating = [];
    
    // Check each card
    for (let i = 0; i < totalCards; i++) {
      const card = cards.nth(i);
      const title = await card.getAttribute('data-title');
      
      // Check for real image (not placeholder)
      const img = card.locator('.card-poster img');
      const imgDisplay = await img.evaluate(el => window.getComputedStyle(el).display);
      const imgSrc = await img.getAttribute('src');
      const hasRealImage = imgDisplay !== 'none' && imgSrc && 
                          !imgSrc.startsWith('data:image/gif');
      
      if (hasRealImage) {
        cardsWithImage++;
      } else {
        missingImage.push(title);
      }
      
      // Check for IMDb rating
      const ratingBadge = card.locator('.imdb-badge, .tvmaze-badge');
      const hasRating = await ratingBadge.count() > 0;
      
      if (hasRating) {
        cardsWithRating++;
      } else {
        missingRating.push(title);
      }
    }
    
    const imagePercent = ((cardsWithImage / totalCards) * 100).toFixed(1);
    const ratingPercent = ((cardsWithRating / totalCards) * 100).toFixed(1);
    
    console.log(`  Cards with real image: ${cardsWithImage}/${totalCards} (${imagePercent}%)`);
    console.log(`  Cards with IMDb rating: ${cardsWithRating}/${totalCards} (${ratingPercent}%)`);
    
    if (missingImage.length > 0 && missingImage.length <= 5) {
      console.log(`  Missing images: ${missingImage.join(', ')}`);
    } else if (missingImage.length > 5) {
      console.log(`  Missing images (first 5): ${missingImage.slice(0, 5).join(', ')}...`);
    }
    
    if (missingRating.length > 0 && missingRating.length <= 5) {
      console.log(`  Missing ratings: ${missingRating.join(', ')}`);
    } else if (missingRating.length > 5) {
      console.log(`  Missing ratings (first 5): ${missingRating.slice(0, 5).join(', ')}...`);
    }
    
    results[tab.name] = {
      total: totalCards,
      withImage: cardsWithImage,
      withRating: cardsWithRating,
      imagePercent: parseFloat(imagePercent),
      ratingPercent: parseFloat(ratingPercent),
      missingImage: missingImage.slice(0, 10),
      missingRating: missingRating.slice(0, 10)
    };
  }
  
  // Take screenshots
  await page.locator('.tab-btn[data-tab="library"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: 'test-results/ios-library-390px.png',
    fullPage: false
  });
  
  await page.locator('.tab-btn[data-tab="newRatings"]').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ 
    path: 'test-results/ios-newratings-390px.png',
    fullPage: false
  });
  
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(results, null, 2));
  
  console.log('\n📸 Screenshots saved:');
  console.log('  - test-results/ios-library-390px.png');
  console.log('  - test-results/ios-newratings-390px.png');
  
  // Report overall health
  const overallImagePercent = Object.values(results).reduce((sum, r) => sum + (r.withImage || 0), 0) / 
                               Object.values(results).reduce((sum, r) => sum + (r.total || 0), 0) * 100;
  const overallRatingPercent = Object.values(results).reduce((sum, r) => sum + (r.withRating || 0), 0) / 
                                Object.values(results).reduce((sum, r) => sum + (r.total || 0), 0) * 100;
  
  console.log(`\nOverall: ${overallImagePercent.toFixed(1)}% have images, ${overallRatingPercent.toFixed(1)}% have ratings`);
  
  // Expect at least 90% coverage
  expect(overallImagePercent).toBeGreaterThan(90);
  expect(overallRatingPercent).toBeGreaterThan(90);
});
