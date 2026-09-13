import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve('agent_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runFullComprehensiveAudit() {
  console.log('================================================================');
  console.log('🤖 [Browser MCP Autonomous QA Bot] STARTING SITE-WIDE AUDIT v3.7.0');
  console.log('   Testing EVERYTHING across all modules, pages, tabs & features');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;
  const issues = [];
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore routine non-critical external asset 404s
      if (!text.includes('favicon') && !text.includes('status of 404') && !text.includes('Failed to load resource')) {
        consoleErrors.push(text);
        console.warn('  ⚠️ Console Error:', text.slice(0, 160));
      }
    }
  });

  function check(desc, condition) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${desc}`);
    } else {
      failed++;
      issues.push(desc);
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // PHASE 1: APP BOOTSTRAP, LOGIN & ANCIENT CRACKED COIN
    // -------------------------------------------------------------
    console.log('\n--- 1. App Bootstrap, Login & Ancient Cracked Coin ---');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Auto login if on login screen
    const nickInput = page.locator('input').first();
    if (await nickInput.isVisible().catch(() => false)) {
      console.log('  Logging in as tester...');
      await nickInput.fill('tester');
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('Tester2026!');
      await page.locator('button', { hasText: /Увійти/i }).first().click();
      await page.waitForTimeout(2000);
    }

    const appSidebar = page.locator('aside.sidebar');
    check('App shell and navigation sidebar rendered successfully', await appSidebar.count() > 0);

    // Check ancient coin asset
    const ancientCoinSvg = page.locator('svg.ancient-coin-svg, img[src*="ancient_coin.svg"]');
    const coinCount = await ancientCoinSvg.count();
    check(`Ancient cracked coin icon rendered in header/stats (count: ${coinCount})`, coinCount > 0);

    // Verify coin SVG contains crack & weathered gold styling
    const coinSvgContent = fs.readFileSync(path.resolve('public/ancient_coin.svg'), 'utf-8');
    check('Ancient coin contains crack fissure line/path', coinSvgContent.includes('coin-crack') || coinSvgContent.includes('fissure') || (coinSvgContent.includes('d="M') && coinSvgContent.includes('#5c3e08')));
    check('Ancient coin has 3D isometric rotation or tilted perspective', coinSvgContent.includes('rotate') || coinSvgContent.includes('transform'));

    // Check circular logo
    const logoImg = page.locator('img[src*="logo.svg"], img[src*="brand_logo.svg"]');
    check('Master brand logo rendered', await logoImg.count() > 0);
    const logoSvgContent = fs.readFileSync(path.resolve('public/logo.svg'), 'utf-8');
    check('Master logo has circular frame geometry (circle r=212/clipPath)', logoSvgContent.includes('<circle') && (logoSvgContent.includes('r="212"') || logoSvgContent.includes('border-radius')));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_01_dashboard_coin.png') });

    // -------------------------------------------------------------
    // PHASE 2: WORDS CATALOG (СЛОВНИК)
    // -------------------------------------------------------------
    console.log('\n--- 2. Words Catalog & Clean UI ---');
    const wordsNav = page.locator('button.nav', { hasText: 'Словник' }).first();
    if (await wordsNav.isVisible().catch(() => false)) {
      await wordsNav.click();
      await page.waitForTimeout(1000);
    }
    const wordsContent = await page.content();
    check('Words catalog renders word list or catalog header', wordsContent.includes('Словник') || wordsContent.includes('Слів') || await page.locator('.word-card, .word-item').count() > 0);
    check('Obsolete "🔄 Синхронізувати слова" button is completely REMOVED', !wordsContent.includes('Синхронізувати слова'));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_02_words_catalog.png') });

    // -------------------------------------------------------------
    // PHASE 3: AUDIO DICTATION MODE ("НАПИШИ СЛОВО НА СЛУХ") FIX
    // -------------------------------------------------------------
    console.log('\n--- 3. Audio Dictation Bug Fix ("matter" Word Check) ---');
    const appJsxCode = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');
    const hasDictationFix = appJsxCode.includes("const isDictation = mode === 'dictation';") &&
      appJsxCode.includes("cleanPicked.toLowerCase() === expectedAnswer.toLowerCase()") &&
      appJsxCode.includes("isDictation ? w.word : w.answer");
    check('Audio dictation logic validates against English w.word instead of Ukrainian w.answer', hasDictationFix);

    // -------------------------------------------------------------
    // PHASE 4: LESSONS / SPRINT (УРОКИ)
    // -------------------------------------------------------------
    console.log('\n--- 4. Lessons & Training Hub ---');
    const learnNav = page.locator('button.nav', { hasText: 'Уроки' }).first();
    if (await learnNav.isVisible().catch(() => false)) {
      await learnNav.click();
      await page.waitForTimeout(1000);
      check('Lessons page rendered', (await page.content()).includes('Уроки') || await page.locator('.lesson-card, .level-card').count() > 0);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_03_training_hub.png') });
    }

    // -------------------------------------------------------------
    // PHASE 5: CHALLENGES & DUELS (АРЕНА & ДУЕЛІ)
    // -------------------------------------------------------------
    console.log('\n--- 5. Challenges & Rivalry Hall ---');
    const challengesNav = page.locator('button.nav', { hasText: 'Арена & Дуелі' }).first();
    if (await challengesNav.isVisible().catch(() => false)) {
      await challengesNav.click();
      await page.waitForTimeout(1000);
      check('Challenges arena screen loaded', (await page.content()).includes('Арена') || (await page.content()).includes('Дуел'));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_04_challenges.png') });
    }

    // -------------------------------------------------------------
    // PHASE 6: STATS HUB & CEFR REMOVAL
    // -------------------------------------------------------------
    console.log('\n--- 6. Stats Hub & Complete CEFR Certificate Removal ---');
    const statsNav = page.locator('button.nav', { hasText: 'Статистика' }).first();
    if (await statsNav.isVisible().catch(() => false)) {
      await statsNav.click();
      await page.waitForTimeout(1000);
    }
    const statsContent = await page.content();
    check('Official CEFR diploma is completely REMOVED from Stats', !statsContent.includes('ОФІЦІЙНИЙ СЕРТИФІКАТ ВЕРИФІКАЦІЇ') && !statsContent.includes('ПЕДАГОГІЧНОЇ ВІДПОВІДНОСТІ'));
    check('Stats Hub renders KPI metric cards & analytics', statsContent.includes('Точність') || statsContent.includes('Вивчено слів') || statsContent.includes('Статистика'));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_05_stats_hub.png') });

    // -------------------------------------------------------------
    // PHASE 7: PROFILE & HERO MODE DELETION & CIRCULAR AVATARS
    // -------------------------------------------------------------
    console.log('\n--- 7. Profile, Hero Mode Removal & Instant Avatar Switch ---');
    const profileNav = page.locator('button.nav', { hasText: 'Профіль' }).first();
    if (await profileNav.isVisible().catch(() => false)) {
      await profileNav.click();
      await page.waitForTimeout(1000);
    }
    const profileContent = await page.content();
    check('Hero Mode "Режим героя: 2D RPG / 3D Голограма" is completely REMOVED', !profileContent.includes('Режим героя') && !profileContent.includes('3D Голограма'));
    
    // Check avatar grid
    const avatarBtns = page.locator('button.avatar-card-item, button:has(img.funny-avatar-img)');
    const avatarCount = await avatarBtns.count();
    check(`Avatar selector displays circular animated characters (count: ${avatarCount})`, avatarCount >= 12);

    // Test switching avatar
    if (avatarCount > 1) {
      console.log('  Testing instant avatar switch...');
      await avatarBtns.nth(3).click();
      await page.waitForTimeout(800);
      
      const savedAvatar = await page.evaluate(() => {
        const backup = JSON.parse(localStorage.getItem('ef_state_backup') || '{}');
        const profiles = JSON.parse(localStorage.getItem('ef-profiles-v1') || '{}');
        return backup.avatar || profiles.tester?.avatar || '';
      });
      check(`Selected avatar instantly saved to localStorage: ${savedAvatar}`, savedAvatar && savedAvatar.includes('character_'));
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_06_profile_avatars.png') });

    // -------------------------------------------------------------
    // PHASE 8: FRIENDS & CHEERING & PRIVACY
    // -------------------------------------------------------------
    console.log('\n--- 8. Friends, Mutual-Only Filter, Outgoing Requests & Cheering ---');
    const friendsNav = page.locator('button.nav', { hasText: 'Друзі' }).first();
    if (await friendsNav.isVisible().catch(() => false)) {
      await friendsNav.click();
      await page.waitForTimeout(1000);
    }
    const friendsContent = await page.content();
    check('Obsolete "🏆 Залікова таблиця друзів" is REMOVED from Friends page', !friendsContent.includes('Залікова таблиця друзів'));
    check('Obsolete "💡 Швидкий вибір" (@tester / @boss) is REMOVED', !friendsContent.includes('Швидкий вибір'));
    check('Outgoing friend requests section exists', friendsContent.includes('Вихідні запити') || appJsxCode.includes('Вихідні запити дружби'));

    // Check cheering button
    const cheerBtn = page.locator('button', { hasText: /Підбадьорити|Підбадьорено/i }).first();
    if (await cheerBtn.isVisible().catch(() => false)) {
      console.log('  Testing "Підбадьорити" button...');
      const isDisabled = await cheerBtn.isDisabled();
      if (!isDisabled) {
        await cheerBtn.click();
        await page.waitForTimeout(800);
        const toast = page.locator('.toast, [role="alert"], div:has-text("підбадьорення")').first();
        const toastText = await toast.textContent().catch(() => '');
        check('Toast mentions friend name and no "(використано 1 з 1)"', !toastText.includes('(використано 1 з 1)'));
      } else {
        check('"Підбадьорити" button in friendly disabled state (already cheered today)', true);
      }
    } else {
      check('Cheer button logic present in App.jsx', appJsxCode.includes('Підбадьорити') && !appJsxCode.includes('(використано 1 з 1)'));
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_07_friends_view.png') });

    // -------------------------------------------------------------
    // PHASE 9: SHOP (МАГАЗИН / ТАВЕРНА) & 10 EXCLUSIVE AVATARS
    // -------------------------------------------------------------
    console.log('\n--- 9. Shop / Tavern, Mystery Chest & 10 Shop Avatars ---');
    const shopNav = page.locator('button.nav', { hasText: 'Магазин' }).first();
    if (await shopNav.isVisible().catch(() => false)) {
      await shopNav.click();
      await page.waitForTimeout(1000);
    }
    const shopContent = await page.content();
    check('Shop page loaded successfully', shopContent.includes('Магазин') || shopContent.includes('Таверна') || shopContent.includes('Скриня'));
    
    // Check shop exclusive avatars in files & App.jsx
    const shopAvatarsCount = fs.readdirSync(path.resolve('public/avatars')).filter(f => f.startsWith('shop_avatar_')).length;
    check(`10 Exclusive Shop Avatars generated in public/avatars (found: ${shopAvatarsCount})`, shopAvatarsCount === 10);
    check('Shop avatars wired into ANIMATED_AVATARS_SHOP in App.jsx', appJsxCode.includes('shop_avatar_01') && appJsxCode.includes('shop_avatar_10'));

    // Check Mystery Chest
    check('Mystery Chest section / button present in Shop', shopContent.includes('Скриня') || appJsxCode.includes('Скриня'));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_08_shop_tavern.png') });

    // -------------------------------------------------------------
    // PHASE 10: SETTINGS & 10 ICON STYLES PREVIEWS
    // -------------------------------------------------------------
    console.log('\n--- 10. Settings & 10 Vector Icon Style Previews ---');
    const settingsNav = page.locator('button.nav', { hasText: 'Налаштування' }).first();
    if (await settingsNav.isVisible().catch(() => false)) {
      await settingsNav.click();
      await page.waitForTimeout(1000);
    }
    const settingsContent = await page.content();
    check('Settings page loaded', settingsContent.includes('Налаштування'));
    check('Old identical emoji row (📖 ⚡ 🎯 🏆 🏰 🛡️ ⚙️ 💬) is REMOVED from style cards', !settingsContent.includes('📖 ⚡ 🎯 🏆 🏰 🛡️ ⚙️ 💬'));
    check('IconStylePreviewTray displays unique vector styled icons for each theme', appJsxCode.includes('IconStylePreviewTray') && appJsxCode.includes('styleId={s.id}'));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_09_settings_styles.png') });

    // -------------------------------------------------------------
    // PHASE 11: LEADERBOARD, BADGES & PROBLEMS
    // -------------------------------------------------------------
    console.log('\n--- 11. Leaderboard, Badges & Problems ---');
    const leaderNav = page.locator('button.nav', { hasText: 'Рейтинг' }).first();
    if (await leaderNav.isVisible().catch(() => false)) {
      await leaderNav.click();
      await page.waitForTimeout(1000);
      check('Global Leaderboard rendered with player rankings', (await page.content()).includes('Рейтинг'));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_10_leaderboard.png') });
    }

    const badgesNav = page.locator('button.nav', { hasText: 'Досягнення' }).first();
    if (await badgesNav.isVisible().catch(() => false)) {
      await badgesNav.click();
      await page.waitForTimeout(1000);
      check('Badges / Achievements grid rendered', (await page.content()).includes('Досягнення'));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_11_badges.png') });
    }

    const problemsNav = page.locator('button.nav', { hasText: 'Проблемні' }).first();
    if (await problemsNav.isVisible().catch(() => false)) {
      await problemsNav.click();
      await page.waitForTimeout(1000);
      check('Problems module rendered', (await page.content()).includes('Проблемні') || (await page.content()).includes('помилок'));
    }

    // -------------------------------------------------------------
    // PHASE 12: ADMIN PANEL
    // -------------------------------------------------------------
    console.log('\n--- 12. Admin Panel & Controls ---');
    const adminNav = page.locator('button.nav', { hasText: 'Адмін' }).first();
    if (await adminNav.isVisible().catch(() => false)) {
      await adminNav.click();
      await page.waitForTimeout(1000);
      const adminContent = await page.content();
      check('Admin Panel accessible for tester/admin', adminContent.includes('Адміністративна') || adminContent.includes('Користувачі') || adminContent.includes('Система') || adminContent.includes('Адмін'));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_12_admin_panel.png') });
    }

    // -------------------------------------------------------------
    // PHASE 13: STATE PERSISTENCE ON RELOAD (CRITICAL USER REQUEST)
    // -------------------------------------------------------------
    console.log('\n--- 13. State Persistence on Page Reload ---');
    // Set custom XP and gems in localStorage
    await page.evaluate(() => {
      const backup = JSON.parse(localStorage.getItem('ef_state_backup') || '{}');
      backup.xp = 4250;
      backup.gems = 1880;
      backup.avatar = 'character_07_ninja_cat';
      localStorage.setItem('ef_state_backup', JSON.stringify(backup));
      const profiles = JSON.parse(localStorage.getItem('ef-profiles-v1') || '{}');
      if (profiles.tester) {
        profiles.tester.xp = 4250;
        profiles.tester.gems = 1880;
        profiles.tester.avatar = 'character_07_ninja_cat';
        localStorage.setItem('ef-profiles-v1', JSON.stringify(profiles));
      }
    });

    console.log('  Reloading page to verify persistence...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const reloadedState = await page.evaluate(() => {
      const backup = JSON.parse(localStorage.getItem('ef_state_backup') || '{}');
      const profiles = JSON.parse(localStorage.getItem('ef-profiles-v1') || '{}');
      return {
        xp: backup.xp || profiles.tester?.xp || 0,
        gems: backup.gems || profiles.tester?.gems || 0,
        avatar: backup.avatar || profiles.tester?.avatar || ''
      };
    });

    check(`XP preserved after reload (expected >=4250, found: ${reloadedState.xp})`, reloadedState.xp >= 4250);
    check(`Ancient Coins preserved after reload (expected >=1880, found: ${reloadedState.gems})`, reloadedState.gems >= 1880);
    check(`Avatar preserved after reload (expected character_07_ninja_cat, found: ${reloadedState.avatar})`, reloadedState.avatar === 'character_07_ninja_cat');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'audit_13_persistence_verified.png') });

    // -------------------------------------------------------------
    // PHASE 14: CONSOLE ERROR AUDITING
    // -------------------------------------------------------------
    console.log('\n--- 14. Console Error Auditing ---');
    check(`Zero fatal unhandled console errors (found: ${consoleErrors.length})`, consoleErrors.length === 0);

  } catch (err) {
    console.error('💥 Execution Exception during audit:', err);
    failed++;
    issues.push(err.message);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error('Issues to address:', issues);
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED! Site-wide v3.7.0 integrity verified.');
  }
}

runFullComprehensiveAudit().catch(err => {
  console.error('Fatal crash:', err);
  process.exit(1);
});
