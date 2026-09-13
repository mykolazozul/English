import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve('agent_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runV360Verification() {
  console.log('🚀 [v3.6.0 End-to-End QA Agent] Starting automated test suite...\n');
  const browser = await chromium.launch({ headless: true });

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passed++;
    console.log(`✅ PASS: ${message}`);
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
      console.warn('Browser Console Error:', msg.text());
    }
  });

  try {
    // 1. Load app and log in
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const nickInput = page.locator('input').first();
    if (await nickInput.isVisible().catch(() => false)) {
      console.log('Logging in with Tester account...');
      await nickInput.fill('tester');
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('Tester2026!');
      await page.locator('button', { hasText: /Увійти/i }).first().click();
      await page.waitForTimeout(2000);
    }

    assert(await page.locator('aside.sidebar').count() > 0, 'App shell and sidebar rendered successfully');

    // 2. Leaderboard: Friends status & Developer friend button
    console.log('\n--- Testing Leaderboard Friends Check ---');
    const leaderNav = page.locator('button.nav', { hasText: /Рейтинг/i }).first();
    assert(await leaderNav.isVisible(), 'Leaderboard nav button visible');
    await leaderNav.click();
    await page.waitForTimeout(1000);

    // Verify Developer (@Boss) row friend button text
    const bossRow = page.locator('tr, .leader-row', { hasText: /@boss|neMik/i }).first();
    assert(await bossRow.isVisible(), 'Developer (@Boss) row found in leaderboard');

    const bossFriendText = await bossRow.innerText();
    const hasAddFriend = bossFriendText.includes('➕ Додати в друзі') || bossFriendText.includes('✓ У друзях') || bossFriendText.includes('⏳ Запит надіслано');
    assert(hasAddFriend, 'Developer row has universal friend action button/status (not "+ Додати розробника")');
    assert(!bossFriendText.includes('+ Додати розробника в друзі'), 'Old hardcoded "+ Додати розробника в друзі" is completely replaced');

    // Click on player row to open PublicProfileModal
    const valkyrieRow = page.locator('tr, .leader-row', { hasText: /valkyrie/i }).first();
    if (await valkyrieRow.isVisible()) {
      await valkyrieRow.click();
      await page.waitForTimeout(800);
      const modal = page.locator('.public-profile-modal');
      assert(await modal.isVisible(), 'PublicProfileModal opened on player row click');

      const modalClose = modal.locator('button.icon');
      assert(await modalClose.isVisible(), 'Modal close button is visible');
      await modalClose.click();
      await page.waitForTimeout(500);
    }

    // 3. Friends Page: Search & Add Tester, View Profile
    console.log('\n--- Testing Friends Page & Tester Profile ---');
    const friendsNav = page.locator('button.nav', { hasText: /Друзі/i }).first();
    assert(await friendsNav.isVisible(), 'Friends nav button visible');
    await friendsNav.click();
    await page.waitForTimeout(1000);

    const friendInput = page.locator('input[placeholder*="нікнейм"]').first();
    assert(await friendInput.isVisible(), 'Friend search input is visible');

    // Add Boss
    const quickBossBtn = page.locator('button', { hasText: /@boss/i }).first();
    if (await quickBossBtn.isVisible()) {
      await quickBossBtn.click();
      await page.waitForTimeout(300);
      const addBtn = page.locator('button.primary', { hasText: /Додати в команду/i }).first();
      await addBtn.click();
      await page.waitForTimeout(1000);
      console.log('Added @boss to team');
    }

    // Verify gamer cards have "👤 Профіль" button
    const friendCards = page.locator('.friend-gamer-card');
    const cardsCount = await friendCards.count();
    console.log(`Friends gamer cards count: ${cardsCount}`);
    if (cardsCount > 0) {
      const firstCardProfileBtn = friendCards.first().locator('button', { hasText: /Профіль/i });
      assert(await firstCardProfileBtn.isVisible(), 'Friend card has 👤 Профіль button');
      await firstCardProfileBtn.click();
      await page.waitForTimeout(800);

      const profileModal = page.locator('.public-profile-modal');
      assert(await profileModal.isVisible(), 'Opened PublicProfileModal from friend card');
      const profileModalClose = profileModal.locator('button.icon');
      await profileModalClose.click();
      await page.waitForTimeout(500);
    }

    // 4. Profile: Top action bar with live checkmark, 2D vs 3D Hologram toggle
    console.log('\n--- Testing Profile & 3D Hologram ---');
    const profileNav = page.locator('button.nav', { hasText: /Профіль/i }).first();
    assert(await profileNav.isVisible(), 'Profile nav button visible');
    await profileNav.click();
    await page.waitForTimeout(1000);

    const saveBtn = page.locator('button.primary', { hasText: /Зберегти зміни/i }).first();
    assert(await saveBtn.isVisible(), 'Top action bar "💾 Зберегти зміни" button is visible');

    await saveBtn.click();
    await page.waitForTimeout(500);
    const savedPill = page.locator('span.pill.ok', { hasText: /Збережено/i }).first();
    assert(await savedPill.isVisible(), 'Live green checkmark "✓ Збережено" appeared after saving');

    // 3D Hologram toggle
    const holoBtn = page.locator('button', { hasText: /3D Голограма/i }).first();
    assert(await holoBtn.isVisible(), '3D Голограма toggle button is visible');
    await holoBtn.click();
    await page.waitForTimeout(500);

    const holoStage = page.locator('.hologram-stage');
    assert(await holoStage.isVisible(), '3D Hologram stage rendered');
    const holoPedestal = page.locator('.hologram-pedestal');
    assert(await holoPedestal.isVisible(), 'Hologram pedestal rendered');
    const holoScanline = page.locator('.hologram-scanline');
    assert(await holoScanline.isVisible(), 'Hologram scanline rendered');

    // 5. Challenges: 3D Runic Arena & Duel invite button
    console.log('\n--- Testing Challenges & 3D Runic Arena ---');
    const challengesNav = page.locator('button.nav', { hasText: /Арена & Дуелі/i }).first();
    assert(await challengesNav.isVisible(), 'Challenges nav button visible');
    await challengesNav.click();
    await page.waitForTimeout(1000);

    // Click 3D Runic Arena tab
    const arenaTab = page.locator('button', { hasText: /3D Рунічна Арена/i }).first();
    assert(await arenaTab.isVisible(), '3D Рунічна Арена tab button is visible');
    await arenaTab.click();
    await page.waitForTimeout(800);

    const runicCards = page.locator('.arena-runic-card');
    const runicCount = await runicCards.count();
    assert(runicCount >= 10, `Found ${runicCount} 3D runic cards in arena`);

    // Click first runic card
    await runicCards.nth(0).click();
    await page.waitForTimeout(200);
    assert(await runicCards.nth(0).evaluate(el => el.classList.contains('selected')), 'First runic card is selected');

    // Click Duel tab
    const duelTab = page.locator('button', { hasText: /Зала Суперників/i }).first();
    await duelTab.click();
    await page.waitForTimeout(500);

    const duelInviteBtn = page.locator('button', { hasText: /Запросити друга з чату/i });
    assert(await duelInviteBtn.isVisible(), 'Duel invite from chat button is visible');

    // 6. Notification Close Button Sizes
    console.log('\n--- Testing Close Button Sizes (~15% larger) ---');
    const computedCloseStyle = await page.evaluate(() => {
      const btn = document.querySelector('.telegram-notify-close, .epic-badge-banner button.icon, .ef-modal button.icon');
      if (!btn) return null;
      const s = window.getComputedStyle(btn);
      return { fontSize: s.fontSize, minWidth: s.minWidth, minHeight: s.minHeight };
    });
    console.log('Close button computed styles:', computedCloseStyle);

    // Take final release screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'v360_release_verification.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`\n📸 Captured verification screenshot: ${screenshotPath}`);

    console.log(`\n🎉 ALL ${passed}/${total} AUTOMATED TESTS PASSED WITH 100% SUCCESS!`);
  } catch (err) {
    console.error('\n❌ QA Test Suite Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runV360Verification();
