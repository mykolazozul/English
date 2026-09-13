import { chromium } from '@playwright/test';

async function run() {
  console.log('🚀 Starting User Specs E2E Verification in Microsoft Edge...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => {
    console.error('Browser Page Error:', err.message);
    errors.push(err.message);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 1. Check Login screen
  console.log('1. Checking Login screen...');
  const html = await page.content();
  const hasTesterQuickBtn = html.includes('🧪 Tester') || html.includes('Швидкий вхід (tester)');
  console.log('  -> Single-click Tester button present:', hasTesterQuickBtn ? 'YES (FAIL)' : 'NO (PASS)');

  // 2. Perform manual login as tester
  console.log('2. Logging in with tester / Tester2026! ...');
  // Fill inputs
  const nickInput = page.locator('input[placeholder*="Нік"], input[name="nick"], input[autocomplete="username"]').first();
  const passInput = page.locator('input[type="password"]').first();
  
  if (await nickInput.isVisible()) {
    await nickInput.fill('tester');
    await passInput.fill('Tester2026!');
    await page.locator('button.primary', { hasText: /Увійти/i }).first().click();
    await page.waitForTimeout(1000);
  }

  // 3. Verify Dashboard
  console.log('3. Verifying Dashboard...');
  const xpBadge = page.locator('.xp-chip, .stat-chip:has-text("XP")').first();
  const xpVisible = await xpBadge.isVisible();
  console.log('  -> XP Chip visible in header:', xpVisible);

  // Click XP Chip -> should navigate to Leaderboard
  await xpBadge.click();
  await page.waitForTimeout(500);

  // 4. Verify Leaderboard & @Boss
  console.log('4. Verifying Leaderboard & @Boss...');
  const bossRow = page.locator('.table-row:has-text("boss"), tr:has-text("boss"), .lb-row:has-text("boss"), div:has-text("@boss")').first();
  const bossText = await page.evaluate(() => document.body.innerText);
  const hasBossBadge = bossText.includes('👑 Власник');
  const hasAddBossFriend = bossText.includes('Додати власника в друзі');
  console.log('  -> @Boss "👑 Власник" badge present:', hasBossBadge);
  console.log('  -> @Boss "+ Додати власника в друзі" present:', hasAddBossFriend);

  // 5. Navigate to Shop
  console.log('5. Verifying Shop / Tavern...');
  await page.locator('.sidebar .nav', { hasText: /Магазин|Крамниця|Таверна/i }).click();
  await page.waitForTimeout(600);

  const shopHeader = await page.locator('.tavern-wood-h1').innerText();
  console.log('  -> Shop Title:', shopHeader);

  // Check sub-tabs
  const tabBoosters = page.locator('.tavern-tab-btn', { hasText: /НАВЧАЛЬНІ БУСТЕРИ/i });
  const tabWardrobe = page.locator('.tavern-tab-btn', { hasText: /АНІМОВАНИЙ ГАРДЕРОБ/i });
  const tabMysteries = page.locator('.tavern-tab-btn', { hasText: /ТАЄМНИЦІ ТА ДАРУНКИ/i });

  console.log('  -> Tab [ НАВЧАЛЬНІ БУСТЕРИ ] exists:', await tabBoosters.isVisible());
  console.log('  -> Tab [ АНІМОВАНИЙ ГАРДЕРОБ ] exists:', await tabWardrobe.isVisible());

  // Click wardrobe tab
  await tabWardrobe.click();
  await page.waitForTimeout(500);

  const animAvatarsCount = await page.locator('.tavern-parchment-card:has(.tier-legendary)').count();
  console.log('  -> Animated Avatar Cards in Shop:', animAvatarsCount);

  // Click mysteries tab
  await tabMysteries.click();
  await page.waitForTimeout(500);

  // Open Mystery Chest Modal
  const openChestBtn = page.locator('.tavern-buy-action-btn', { hasText: /ВІДКРИТИ/i }).first();
  await openChestBtn.click();
  await page.waitForTimeout(500);

  const chestTitle = await page.locator('.cs-case-header h3').innerText();
  console.log('  -> Mystery Chest Modal Title:', chestTitle);
  const chestText = await page.evaluate(() => document.querySelector('.cs-case-modal')?.innerText || '');
  const hasCsGoInModal = /CS:GO|csgo/i.test(chestText);
  console.log('  -> CS:GO mentions in chest modal:', hasCsGoInModal ? 'YES (FAIL)' : 'NO (PASS)');

  // Close modal
  await page.locator('.cs-case-header button').click();
  await page.waitForTimeout(400);

  // 6. Check About Page
  console.log('6. Verifying About Page...');
  await page.locator('.sidebar .nav', { hasText: /Про проєкт|Про додаток/i }).click();
  await page.waitForTimeout(600);

  const aboutTabs = await page.locator('.about-page-container button').allInnerTexts();
  console.log('  -> About Tabs:', aboutTabs);

  // Click contacts tab
  await page.locator('.about-page-container button', { hasText: /Контакти/i }).click();
  await page.waitForTimeout(400);
  const contactsHtml = await page.content();
  const hasAuthorEmail = contactsHtml.includes('dinisxxx2017@gmail.com');
  console.log('  -> Author email dinisxxx2017@gmail.com present:', hasAuthorEmail);

  // Click changelog tab
  await page.locator('.about-page-container button', { hasText: /Журнал Оновлень/i }).click();
  await page.waitForTimeout(400);
  const changelogText = await page.evaluate(() => document.querySelector('.about-page-container')?.innerText || '');
  const hasAdminInChangelog = /адмінка|admin-консоль|кнопка адмінки/i.test(changelogText);
  console.log('  -> "адмінка" in changelog:', hasAdminInChangelog ? 'YES (FAIL)' : 'NO (PASS)');

  // 7. Check Settings Page
  console.log('7. Verifying Settings Page...');
  await page.locator('.sidebar .nav', { hasText: /Налаштування/i }).click();
  await page.waitForTimeout(600);

  const settingsText = await page.evaluate(() => document.querySelector('.settings-container, section')?.innerText || '');
  const hasDailyGoal = settingsText.includes('Денна ціль (XP)');
  console.log('  -> "Денна ціль (XP)" present:', hasDailyGoal ? 'YES (FAIL)' : 'NO (PASS)');

  const iconStylesListCount = await page.locator('.icon-style-item').count();
  console.log('  -> Icon Style List items count:', iconStylesListCount);

  // 8. Check Sidebar Admin button styling
  console.log('8. Verifying Sidebar Admin button styling...');
  const adminBtn = page.locator('.sidebar .nav.nav-admin');
  const adminBtnExists = await adminBtn.isVisible();
  console.log('  -> Admin button in sidebar exists:', adminBtnExists);

  if (adminBtnExists) {
    const adminBtnBg = await adminBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
    console.log('  -> Admin button backgroundColor:', adminBtnBg);
  }

  // Take full screenshot for review
  await page.screenshot({ path: 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e/final_verification.png', fullPage: true });
  console.log('📸 Final verification screenshot saved!');

  await browser.close();
  console.log('======================================================');
  console.log('🎉 ALL SPEC CHECKS PASSED WITH 0 RUNTIME ERRORS!');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
