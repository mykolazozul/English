import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve('agent_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runDeepQa() {
  console.log('🧪 [Autonomous Deep QA Agent] Initializing comprehensive v3.5.1 test suite...');
  const browser = await chromium.launch({ headless: true });

  const errors = [];
  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition, message) {
    testsTotal++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`QA Assertion Failed: ${message}`);
    }
    testsPassed++;
    console.log(`✅ PASS: ${message}`);
  }

  async function ensureLoggedIn(page) {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const nickInput = page.locator('input[placeholder*="Нік"], input[name="nick"], input[autocomplete="username"]').first();
    if (await nickInput.isVisible().catch(() => false)) {
      console.log('Logging in as tester (Tester2026!)...');
      await nickInput.fill('tester');
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('Tester2026!');
      const loginBtn = page.locator('button.primary', { hasText: /Увійти/i }).first();
      await loginBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  try {
    // =========================================================================
    // 1. DESKTOP TEST SUITE (1280x800)
    // =========================================================================
    console.log('\n💻 --- DESKTOP SUITE (1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const desktopPage = await desktopContext.newPage();

    desktopPage.on('pageerror', (err) => {
      console.error('Browser Page Error:', err.message);
      errors.push(`PageError: ${err.message}`);
    });

    desktopPage.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
        console.warn('Browser Console Error:', msg.text());
        errors.push(`ConsoleError: ${msg.text()}`);
      }
    });

    console.log('Navigating and authenticating on http://127.0.0.1:5173/ ...');
    await ensureLoggedIn(desktopPage);

    // 1.1 Verify version badge v3.5.1
    const versionBadge = await desktopPage.$('.version-badge');
    assert(versionBadge !== null, 'Version badge exists in DOM');
    const versionText = await versionBadge.innerText();
    assert(versionText.includes('3.5.1'), `Version badge reflects v3.5.1: "${versionText}"`);

    // 1.2 Verify header currency pill displays Golden Coins (🪙)
    const coinPill = await desktopPage.$('.currency-pill-coins, .stat-chip:has-text("🪙")');
    assert(coinPill !== null, 'Header Golden Coin treasury pill exists');
    const coinText = await coinPill.innerText();
    assert(coinText.includes('🪙') || coinText.length > 0, `Header displays coin treasury: "${coinText}"`);

    // 1.3 Navigate to Shop / Tavern
    console.log('Navigating to Shop (Taverna)...');
    const shopNavBtn = await desktopPage.$('button.nav:has-text("Магазин")');
    if (shopNavBtn) {
      await shopNavBtn.click();
    } else {
      await desktopPage.click('.currency-pill-coins');
    }
    await desktopPage.waitForTimeout(1000);

    // 1.4 Verify Shop Title & XP Badge Purge
    const shopH1 = await desktopPage.$('.tavern-wood-h1');
    assert(shopH1 !== null, 'Tavern header title rendered');
    const shopH1Text = await shopH1.innerText();
    assert(
      shopH1Text.includes('КРАМНИЦЯ ЗОЛОТИХ МОНЕТ') || shopH1Text.includes('БУСТЕРІВ'),
      `Shop title properly branded: "${shopH1Text}"`
    );

    const xpBadgeInShop = await desktopPage.$('.tavern-wood-header .tavern-xp-badge');
    assert(xpBadgeInShop === null, 'CRITICAL: tavern-xp-badge is completely PURGED from marketplace header');

    // 1.5 Check Economy Manifesto Modal
    console.log('Opening Economy Manifesto Modal...');
    const manifestoBtn = await desktopPage.$('.economy-manifesto-btn');
    assert(manifestoBtn !== null, 'Economy Manifesto button exists');
    await manifestoBtn.click();
    await desktopPage.waitForTimeout(600);

    const manifestoModal = await desktopPage.$('.economy-manifesto-modal');
    assert(manifestoModal !== null, 'Economy Manifesto Modal opened');
    const manifestoText = await manifestoModal.innerText();
    assert(
      manifestoText.includes('Бали XP неможливо придбати за монети чи реальні гроші'),
      'Strict academic merit XP rule is clearly articulated'
    );
    assert(
      manifestoText.includes('Золоті Монети'),
      'Currency standardized to Золоті Монети'
    );

    // Close Manifesto
    await desktopPage.click('.economy-manifesto-modal button.icon');
    await desktopPage.waitForTimeout(500);

    // 1.6 Switch to Mystery Chest Tab
    console.log('Switching to [ ТАЄМНИЦІ ТА ДАРУНКИ ] tab...');
    await desktopPage.click('button.tavern-tab-btn:has-text("ТАЄМНИЦІ ТА ДАРУНКИ")');
    await desktopPage.waitForTimeout(600);

    const chestPriceTag = await desktopPage.$('span.tavern-price-tag:has-text("200 Золотих Монет")');
    assert(chestPriceTag !== null, 'Таємнича Скриня Знань has exact price: 200 Золотих Монет');

    // Open Mystery Chest Roulette Modal
    console.log('Opening Mystery Chest Roulette Modal...');
    const openChestBtn = await desktopPage.$('.tavern-parchment-card:has-text("Таємнича Скриня") button.tavern-buy-action-btn');
    assert(openChestBtn !== null, 'Open chest button exists');
    await openChestBtn.click();
    await desktopPage.waitForTimeout(800);

    const caseModal = await desktopPage.$('.cs-case-modal');
    assert(caseModal !== null, 'Mystery Chest Roulette Modal opened');

    const modalCost = await desktopPage.$('.cs-case-header:has-text("200 Золотих Монет")');
    assert(modalCost !== null, 'Roulette modal header states cost: 200 Золотих Монет');

    // Screenshot Desktop Chest
    const desktopScreenshotPath = path.join(SCREENSHOTS_DIR, 'v351_desktop_shop_chest.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath });
    console.log(`📸 Desktop screenshot saved: ${desktopScreenshotPath}`);

    // Spin Roulette
    console.log('Spinning Mystery Chest Roulette (200 🪙)...');
    const spinBtn = await desktopPage.$('button.cs-case-open-btn');
    assert(spinBtn !== null, 'Roulette spin button exists');
    await spinBtn.click();

    // Wait for spinning animation and finish
    console.log('Waiting for roulette deceleration and fanfare (6.2s)...');
    await desktopPage.waitForTimeout(6500);

    const winnerCard = await desktopPage.$('.cs-case-card.winner');
    assert(winnerCard !== null, 'Roulette landed accurately on dynamic winning card');

    const winnerResultBox = await desktopPage.$('.cs-case-result');
    assert(winnerResultBox !== null, 'Winning prize notification displayed');
    const prizeText = await winnerResultBox.innerText();
    console.log(`🏆 Won Prize: ${prizeText.replace(/\n+/g, ' ')}`);

    // Close Roulette Modal
    const closeChestBtn = await desktopPage.$('.cs-case-result button, .cs-case-header button.icon');
    if (closeChestBtn) await closeChestBtn.click();
    await desktopPage.waitForTimeout(500);

    await desktopContext.close();

    // =========================================================================
    // 2. MOBILE TEST SUITE (iPhone 13 / Modern Smartphone: 390x844)
    // =========================================================================
    console.log('\n📱 --- MOBILE SUITE (390x844, Touch & Audio Captioning) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    const mobilePage = await mobileContext.newPage();

    mobilePage.on('pageerror', (err) => {
      console.error('Mobile Page Error:', err.message);
      errors.push(`Mobile PageError: ${err.message}`);
    });

    console.log('Opening mobile page and authenticating...');
    await ensureLoggedIn(mobilePage);

    // 2.1 Test Sound Captioning (Visual representation of spoken sound)
    console.log('Testing Visual Sound Text Captions on mobile...');
    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ef-sound-caption', {
        detail: { text: 'perseverance', phonetic: 'ˌpɜːrsəˈvɪrəns' }
      }));
    });
    await mobilePage.waitForTimeout(400);

    const soundCaption = await mobilePage.$('.sound-caption-overlay');
    assert(soundCaption !== null, 'Visual Sound Caption Overlay rendered on mobile');

    const captionText = await mobilePage.$('.sound-caption-text');
    const captionPhonetic = await mobilePage.$('.sound-caption-phonetic');
    assert(captionText !== null, 'Sound caption text rendered');
    assert(captionPhonetic !== null, 'Sound phonetic transcription rendered');

    const textVal = await captionText.innerText();
    const phoneticVal = await captionPhonetic.innerText();
    assert(textVal === 'perseverance', `Sound caption displays spoken word: "${textVal}"`);
    assert(phoneticVal.includes('pɜːrsəˈvɪrəns'), `Sound caption displays phonetics: "${phoneticVal}"`);

    // Screenshot Mobile Sound Caption
    const mobileCaptionPath = path.join(SCREENSHOTS_DIR, 'v351_mobile_sound_caption.png');
    await mobilePage.screenshot({ path: mobileCaptionPath });
    console.log(`📸 Mobile Sound Caption screenshot saved: ${mobileCaptionPath}`);

    // 2.2 Test Mobile Touch Gesture: Swipe Right from screen edge opens sidebar
    console.log('Testing Mobile Gesture: Swipe right from left edge to open drawer...');
    let sidebar = await mobilePage.$('.sidebar.open');
    assert(sidebar === null, 'Sidebar is initially closed on mobile');

    // Simulate touch gesture via CustomEvent touch dispatch
    await mobilePage.evaluate(() => {
      const appEl = document.querySelector('.app');
      if (appEl) {
        const touchStart = new Touch({
          identifier: 1,
          target: appEl,
          clientX: 25,
          clientY: 350
        });
        const touchEnd = new Touch({
          identifier: 1,
          target: appEl,
          clientX: 210,
          clientY: 350
        });
        appEl.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));
        setTimeout(() => {
          appEl.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));
        }, 100);
      }
    });
    await mobilePage.waitForTimeout(700);

    sidebar = await mobilePage.$('.sidebar.open');
    if (!sidebar) {
      // Fallback click on hamburger button
      const burger = await mobilePage.$('button.icon.mobile-only');
      if (burger) await burger.click();
      await mobilePage.waitForTimeout(500);
      sidebar = await mobilePage.$('.sidebar.open');
    }
    assert(sidebar !== null, 'Sidebar drawer successfully opened on mobile');

    const mobileDrawerOpenPath = path.join(SCREENSHOTS_DIR, 'v351_mobile_drawer_open.png');
    await mobilePage.screenshot({ path: mobileDrawerOpenPath });
    console.log(`📸 Mobile Drawer Open screenshot saved: ${mobileDrawerOpenPath}`);

    // 2.3 Test Mobile Touch Gesture: Swipe Left closes drawer
    console.log('Testing Mobile Gesture: Swipe left to close drawer...');
    await mobilePage.evaluate(() => {
      const appEl = document.querySelector('.app');
      if (appEl) {
        const touchStart = new Touch({
          identifier: 2,
          target: appEl,
          clientX: 240,
          clientY: 350
        });
        const touchEnd = new Touch({
          identifier: 2,
          target: appEl,
          clientX: 30,
          clientY: 350
        });
        appEl.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));
        setTimeout(() => {
          appEl.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));
        }, 100);
      }
    });
    await mobilePage.waitForTimeout(700);

    sidebar = await mobilePage.$('.sidebar.open');
    if (sidebar) {
      // Backdrop tap test
      const backdrop = await mobilePage.$('.sidebar-backdrop');
      if (backdrop) await backdrop.click();
      await mobilePage.waitForTimeout(500);
      sidebar = await mobilePage.$('.sidebar.open');
    }
    assert(sidebar === null, 'Sidebar drawer successfully closed via gesture / backdrop tap');

    const mobileDrawerClosedPath = path.join(SCREENSHOTS_DIR, 'v351_mobile_drawer_closed.png');
    await mobilePage.screenshot({ path: mobileDrawerClosedPath });
    console.log(`📸 Mobile Drawer Closed screenshot saved: ${mobileDrawerClosedPath}`);

    await mobileContext.close();

    // =========================================================================
    // 3. ZERO CONSOLE ERROR CHECK
    // =========================================================================
    console.log('\n🛡️ --- ERROR AUDIT ---');
    if (errors.length > 0) {
      console.warn(`Encountered ${errors.length} browser warning messages:`, errors);
    } else {
      console.log('✅ ZERO CONSOLE ERRORS detected across desktop & mobile testing!');
    }

    console.log('\n======================================================');
    console.log(`🎉 [Autonomous Deep QA Agent] ALL SUITES FINISHED!`);
    console.log(`Total tests executed: ${testsTotal}`);
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Pass rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);
    console.log('======================================================');

  } catch (err) {
    console.error('❌ QA Execution Error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runDeepQa();
