const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    
    // Test at desktop width (1280px)
    console.log('🖥️  TESTING DESKTOP (1280px width)');
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopContext.newPage();
    
    const desktopErrors = [];
    desktopPage.on('console', msg => {
        if (msg.type() === 'error') desktopErrors.push(msg.text());
    });
    desktopPage.on('pageerror', error => desktopErrors.push(error.message));
    
    await desktopPage.goto('https://whizkidgrown.github.io/videobuddy/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
    });
    await desktopPage.waitForTimeout(3000);
    
    // Check Watched tab
    await desktopPage.locator('[data-tab="library"]').click();
    await desktopPage.waitForTimeout(1000);
    
    const desktopWatchedCount = await desktopPage.locator('#libraryGrid .show-card').count();
    const desktopCountText = await desktopPage.locator('#libraryCount').textContent();
    
    console.log(`  Cards in Watched: ${desktopWatchedCount}`);
    console.log(`  Count text: ${desktopCountText}`);
    console.log(`  Console errors: ${desktopErrors.length === 0 ? '✓ None' : desktopErrors.length}`);
    
    await desktopPage.screenshot({ path: '/workspace/desktop-1280px.png', fullPage: true });
    console.log('  ✓ Screenshot saved: desktop-1280px.png');
    
    await desktopContext.close();
    
    // Test at mobile width (390px)
    console.log('\n📱 TESTING MOBILE (390px width)');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    
    const mobileErrors = [];
    mobilePage.on('console', msg => {
        if (msg.type() === 'error') mobileErrors.push(msg.text());
    });
    mobilePage.on('pageerror', error => mobileErrors.push(error.message));
    
    await mobilePage.goto('https://whizkidgrown.github.io/videobuddy/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
    });
    await mobilePage.waitForTimeout(3000);
    
    // Check Watched tab
    await mobilePage.locator('[data-tab="library"]').click();
    await mobilePage.waitForTimeout(1000);
    
    const mobileWatchedCount = await mobilePage.locator('#libraryGrid .show-card').count();
    const mobileCountText = await mobilePage.locator('#libraryCount').textContent();
    
    console.log(`  Cards in Watched: ${mobileWatchedCount}`);
    console.log(`  Count text: ${mobileCountText}`);
    console.log(`  Console errors: ${mobileErrors.length === 0 ? '✓ None' : mobileErrors.length}`);
    
    await mobilePage.screenshot({ path: '/workspace/mobile-390px.png', fullPage: true });
    console.log('  ✓ Screenshot saved: mobile-390px.png');
    
    await mobileContext.close();
    
    // Summary
    console.log('\n📋 SUMMARY:');
    const expectedWatched = 133; // DB seeded ratings
    const watchedInRange = desktopWatchedCount >= 130 && desktopWatchedCount <= 140;
    const noErrors = desktopErrors.length === 0 && mobileErrors.length === 0;
    const countMatch = desktopWatchedCount === mobileWatchedCount;
    
    console.log(`  Desktop errors: ${desktopErrors.length === 0 ? '✓ None' : `✗ ${desktopErrors.length}`}`);
    console.log(`  Mobile errors: ${mobileErrors.length === 0 ? '✓ None' : `✗ ${mobileErrors.length}`}`);
    console.log(`  Watched count: ${watchedInRange ? `✓ ${desktopWatchedCount} (expected ~${expectedWatched})` : `✗ ${desktopWatchedCount}`}`);
    console.log(`  Desktop/Mobile match: ${countMatch ? '✓ Yes' : '✗ No'}`);
    console.log(`  Only rated shown: ${desktopWatchedCount < 147 ? '✓ Yes (unrated hidden)' : '✗ No (showing all)'}`);
    
    const allGood = noErrors && watchedInRange && countMatch && desktopWatchedCount < 147;
    console.log(`\n${allGood ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
    
    await browser.close();
    process.exit(allGood ? 0 : 1);
})();
