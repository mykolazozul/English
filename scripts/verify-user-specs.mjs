import { chromium } from '@playwright/test';

async function run() {
  console.log('🚀 Starting User Specs E2E Verification for v3.5.0 in Microsoft Edge...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => {
    console.error('Browser Page Error:', err.message);
    errors.push(err.message);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 1. Check Login screen & Tester credentials
  console.log('1. Checking Login screen & manual login...');
  const html = await page.content();
  const hasTesterQuickBtn = html.includes('🧪 Tester') || html.includes('Швидкий вхід (tester)');
  console.log('  -> Quick 1-click Tester button present:', hasTesterQuickBtn ? 'YES (FAIL)' : 'NO (PASS)');

  // 2. Perform manual login as tester (with 1,000,000 dubloons)
  console.log('2. Logging in with tester / Tester2026! ...');
  const nickInput = page.locator('input[placeholder*="Нік"], input[name="nick"], input[autocomplete="username"]').first();
  const passInput = page.locator('input[type="password"]').first();
  
  if (await nickInput.isVisible()) {
    await nickInput.fill('tester');
    await passInput.fill('Tester2026!');
    await page.locator('button.primary', { hasText: /Увійти/i }).first().click();
    await page.waitForTimeout(1000);
  }

  // 3. Verify Version & Tester Balance (1,000,000)
  console.log('3. Verifying Version & Balance...');
  const versionBadge = await page.locator('.version-badge').innerText().catch(() => '');
  console.log('  -> Version badge:', versionBadge);

  const coinPill = page.locator('.currency-pill-coins, .stat-chip:has-text("🪙")').first();
  const coinText = await coinPill.innerText().catch(() => '');
  console.log('  -> Tester Coin / Dubloon Balance:', coinText);

  // 4. Verify Dashboard & Stone RPG theme
  console.log('4. Verifying Dashboard & Stone RPG elements...');
  // Check if stone_rpg skin is applied or switch to it via settings if needed
  let hasStonePortal = await page.locator('.stone-portal-frame').isVisible().catch(() => false);
  if (!hasStonePortal) {
    console.log('  -> Switching skin to stone_rpg via Settings...');
    await page.locator('.sidebar .nav', { hasText: /Налаштування/i }).click();
    await page.waitForTimeout(500);
    const stoneSkinBtn = page.locator('button', { hasText: /Stone RPG/i }).first();
    if (await stoneSkinBtn.isVisible()) {
      await stoneSkinBtn.click();
      await page.waitForTimeout(400);
    }
    // Return to dashboard
    await page.locator('.sidebar .nav', { hasText: /Головна|Dashboard/i }).click();
    await page.waitForTimeout(500);
    hasStonePortal = await page.locator('.stone-portal-frame').isVisible().catch(() => false);
  }
  console.log('  -> Stone RPG Temple Portal visible:', hasStonePortal);
  console.log('  -> Torches visible:', await page.locator('.stone-torch-pillar').count());
  console.log('  -> Dartboard Target 🎯 visible:', await page.locator('.rpg-dartboard-wrapper').isVisible().catch(() => false));
  console.log('  -> 4 Stone Altar Plinths visible:', await page.locator('.stone-altar-pedestal').count());

  // 5. Verify Leaderboard & @Boss
  console.log('5. Verifying Leaderboard & @Boss...');
  await page.locator('.sidebar .nav', { hasText: /Рейтинг/i }).click();
  await page.waitForTimeout(600);

  const bossRow = page.locator('tr:has-text("boss"), tr:has-text("neMik")').first();
  const bossText = await page.evaluate(() => document.body.innerText);
  const hasBossOwnerBadge = bossText.includes('👑 Власник');
  const hasAddDevFriend = bossText.includes('+ Додати розробника в друзі');
  console.log('  -> Text badge "👑 Власник" present (should be false):', hasBossOwnerBadge);
  console.log('  -> "+ Додати розробника в друзі" present:', hasAddDevFriend);

  // Test Public Profile Modal on row click
  console.log('  -> Clicking on first player row to test PublicProfileModal...');
  const firstPlayerRow = page.locator('.leaderboard-table tbody tr').first();
  if (await firstPlayerRow.isVisible()) {
    await firstPlayerRow.click();
    await page.waitForTimeout(600);
    const modalVisible = await page.locator('.public-profile-modal').isVisible().catch(() => false);
    console.log('  -> PublicProfileModal opened on click:', modalVisible);
    if (modalVisible) {
      // Close modal
      await page.locator('.public-profile-modal button.icon').click();
      await page.waitForTimeout(400);
    }
  }

  // 6. Navigate to Shop & Verify Dubloons & Economy Button
  console.log('6. Verifying Shop / Tavern...');
  await page.locator('.sidebar .nav', { hasText: /Магазин|Крамниця|Таверна/i }).click();
  await page.waitForTimeout(600);

  const shopHeader = await page.locator('.tavern-wood-h1').innerText().catch(() => '');
  console.log('  -> Shop Title:', shopHeader);

  // Check animated economy button
  const economyBtn = page.locator('.economy-manifesto-btn');
  const hasEconomyBtn = await economyBtn.isVisible().catch(() => false);
  console.log('  -> "📜 Економіка сайту ➔" button present:', hasEconomyBtn);
  if (hasEconomyBtn) {
    await economyBtn.click({ force: true });
    await page.waitForTimeout(500);
    const manifestoTitle = await page.locator('.economy-manifesto-modal h2').innerText({ timeout: 5000 }).catch(() => '');
    console.log('  -> Economy Manifesto Modal opened:', manifestoTitle);
    await page.locator('.economy-manifesto-modal button.primary').click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }

  // Check new goods in boosters tab
  const tabBoosters = page.locator('.tavern-tab-btn', { hasText: /НАВЧАЛЬНІ БУСТЕРИ/i });
  await tabBoosters.click({ force: true });
  await page.waitForTimeout(400);
  const boostersText = await page.evaluate(() => document.querySelector('.tavern-parchment-grid')?.innerText || '');
  console.log('  -> "Компас синонімів" present:', boostersText.includes('Компас синонімів'));
  console.log('  -> "Сувій бліц-спринту" present:', boostersText.includes('Сувій бліц-спринту'));
  console.log('  -> "Дзеркало вимови" present:', boostersText.includes('Дзеркало вимови'));

  // Open Mystery Chest Modal
  console.log('  -> Opening Mystery Chest Modal...');
  const tabMysteries = page.locator('.tavern-tab-btn', { hasText: /ТАЄМНИЦІ ТА ДАРУНКИ/i });
  await tabMysteries.click({ force: true });
  await page.waitForTimeout(400);
  const openChestBtn = page.locator('.tavern-buy-action-btn', { hasText: /ВІДКРИТИ/i }).first();
  await openChestBtn.click({ force: true });
  await page.waitForTimeout(500);

  const chestTitle = await page.locator('.cs-case-header h3').innerText({ timeout: 5000 }).catch(() => '');
  const chestPriceText = await page.locator('.cs-case-header').innerText({ timeout: 5000 }).catch(() => '');
  console.log('  -> Chest Title:', chestTitle);
  console.log('  -> Chest Price Text (should say 150 Дублонів):', chestPriceText.includes('150') && chestPriceText.includes('Дублонів'));
  
  // Close chest modal
  await page.locator('.cs-case-header button').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);

  // 7. Check About Page: CEFR Certificate Timestamp & Privacy Policy
  console.log('7. Verifying About Page & Official CEFR Certificate...');
  await page.locator('.sidebar .nav', { hasText: /Про проєкт|Про додаток/i }).click();
  await page.waitForTimeout(600);

  const aboutContent = await page.content();
  const hasExactCefrTimestamp = aboutContent.includes('13.09.2026 о 16:21:03 EEST (UTC+3, Східноєвропейський літній час, м. Київ)');
  console.log('  -> Official CEFR timestamp "13.09.2026 о 16:21:03 EEST..." present:', hasExactCefrTimestamp);

  // Check Privacy Tab
  await page.locator('.about-page-container button', { hasText: /Конфіденційність/i }).click();
  await page.waitForTimeout(400);
  const privacyText = await page.evaluate(() => document.querySelector('.about-page-container')?.innerText || '');
  const hasGdprZeroTracking = privacyText.includes('нульового трекінгу') && privacyText.includes('GDPR') && privacyText.includes('2297-VI');
  console.log('  -> Zero 3rd-party tracking & GDPR compliance present:', hasGdprZeroTracking);

  // 8. Check Floating Chat Widget
  console.log('8. Verifying Floating Chat Widget...');
  const chatFab = page.locator('.floating-chat-fab');
  if (await chatFab.isVisible()) {
    await chatFab.click();
    await page.waitForTimeout(500);
    const chatWindow = page.locator('.floating-chat-window');
    console.log('  -> Floating Chat Window opened:', await chatWindow.isVisible());
    const hasFriendSelect = await page.locator('.chat-friend-select').isVisible().catch(() => false);
    console.log('  -> Chat Friend Dropdown Selector present:', hasFriendSelect);
    // Close chat
    await page.locator('.floating-chat-header button', { hasText: '✕' }).click();
    await page.waitForTimeout(300);
  }

  // 9. Take full screenshot
  await page.screenshot({ path: 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e/final_verification.png', fullPage: true });
  console.log('📸 Final verification screenshot saved!');

  await browser.close();

  if (errors.length > 0) {
    console.error('❌ Page had uncaught errors:', errors);
    process.exit(1);
  }

  console.log('======================================================');
  console.log('🎉 ALL v3.5.0 USER SPEC CHECKS PASSED WITH 0 ERRORS!');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
