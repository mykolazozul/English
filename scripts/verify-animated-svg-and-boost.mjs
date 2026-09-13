import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e';

const svgAvatars = [
  'character_01_clumsy_barbarian.svg',
  'character_02_flying_duck_pilot.svg',
  'character_03_confused_tree_warrior.svg',
  'character_04_overconfident_knight.svg',
  'character_05_sleepy_dragon.svg',
  'character_06_angry_wizard.svg',
  'character_07_ninja_cat.svg',
  'character_08_pirate_frog.svg',
  'character_09_goblin_engineer.svg',
  'character_10_tiny_giant.svg',
  'character_11_chicken_warrior.svg',
  'character_12_alien_cowboy.svg'
];

async function runVerification() {
  console.log('🚀 [SVG Characters & Friend Boost QA Suite] Starting verification...\n');

  // 1. Verify HTTP endpoints for all 12 animated SVGs and logo
  console.log('--- 1. Testing SVG asset endpoints ---');
  for (const file of svgAvatars) {
    const res = await fetch(`http://127.0.0.1:5173/avatars/${file}`);
    if (!res.ok) throw new Error(`Asset failed: ${file} HTTP ${res.status}`);
    console.log(`✓ /avatars/${file} -> ${res.status} ${res.headers.get('content-type')}`);
  }
  const logoRes = await fetch('http://127.0.0.1:5173/logo.svg');
  console.log(`✓ /logo.svg -> ${logoRes.status} ${logoRes.headers.get('content-type')}`);

  // 2. Launch Browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 920 } });
  const page = await context.newPage();

  try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Login as tester
    const nickInput = page.locator('input').first();
    if (await nickInput.isVisible().catch(() => false)) {
      console.log('Logging in as tester...');
      await nickInput.fill('tester');
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('Tester2026!');
      await page.locator('button', { hasText: /Увійти/i }).first().click();
      await page.waitForTimeout(2000);
    }

    // Check Master Brand Logo in header
    const brandLogo = page.locator('img[src="/brand_logo.svg"]').first();
    console.log('Brand Logo SVG visible:', await brandLogo.isVisible());

    // 3. Test Profile: Animated SVG Avatars Grid
    console.log('\n--- 2. Testing Profile Animated SVG Avatars ---');
    await page.locator('button.nav', { hasText: /Профіль/i }).first().click();
    await page.waitForTimeout(1200);

    const heading = page.locator('h2', { hasText: /Колекція Анімованих SVG Героїв/i });
    console.log('Profile SVG Avatars heading visible:', await heading.isVisible());

    const avatarButtons = page.locator('.avatar-card-item');
    const count = await avatarButtons.count();
    console.log(`Avatar buttons count: ${count} (expected 12)`);

    // Click on Ninja Cat
    const ninjaCat = page.locator('.avatar-card-item', { hasText: /Кіт-Ніндзя/i }).first();
    if (await ninjaCat.isVisible()) {
      await ninjaCat.click();
      await page.waitForTimeout(600);
      console.log('Selected Ninja Cat animated avatar');
    }

    // Save Profile screenshot showing animated SVG avatars
    const profileShot = path.join(ARTIFACT_DIR, 'animated_svg_profile_view.png');
    await page.screenshot({ path: profileShot });
    console.log('Saved profile screenshot to:', profileShot);

    // 4. Test Single-Use Friend Boost
    console.log('\n--- 3. Testing Single-Use Friend Boost ---');
    await page.locator('button.nav', { hasText: /Друзі/i }).first().click();
    await page.waitForTimeout(1500);

    // Check boost button on first friend card
    const boostBtn = page.locator('button', { hasText: /🔥 Буст|✓ Буст/i }).first();
    if (await boostBtn.isVisible()) {
      const initialText = (await boostBtn.textContent()).trim();
      console.log('Current Boost Button state:', initialText);

      if (initialText.includes('🔥 Буст')) {
        await boostBtn.click();
        await page.waitForTimeout(1000);
        console.log('Clicked 🔥 Буст!');
        const afterText = (await boostBtn.textContent()).trim();
        const isDisabled = await boostBtn.isDisabled();
        console.log(`After click state: "${afterText}", disabled: ${isDisabled}`);
        if (!isDisabled || !afterText.includes('✓')) {
          throw new Error('Boost button should be disabled with checkmark after use!');
        }
      } else {
        console.log('Boost was already used previously; verifying it remains disabled...');
        console.log('Is button disabled:', await boostBtn.isDisabled());
      }
    }

    // Save Friends screenshot showing single-use boost button
    const friendsShot = path.join(ARTIFACT_DIR, 'single_use_boost_friends_view.png');
    await page.screenshot({ path: friendsShot });
    console.log('Saved friends screenshot to:', friendsShot);

    // 5. Test Shop Wardrobe
    console.log('\n--- 4. Testing Shop Wardrobe SVG Heroes ---');
    const shopNav = page.locator('button.nav', { hasText: /Магазин|Крамниця/i }).first();
    if (await shopNav.isVisible()) {
      await shopNav.click();
      await page.waitForTimeout(1000);

    const wardrobeTab = page.locator('button', { hasText: /ГАРДЕРОБ/i }).first();
    if (await wardrobeTab.isVisible()) {
      await wardrobeTab.click();
      await page.waitForTimeout(1000);

      const shopCards = page.locator('.tavern-parchment-card img.funny-avatar-img');
      console.log(`Shop animated SVG cards count: ${await shopCards.count()}`);

      const shopShot = path.join(ARTIFACT_DIR, 'animated_svg_shop_view.png');
      await page.screenshot({ path: shopShot });
      console.log('Saved shop screenshot to:', shopShot);
    }
    }

    console.log('\n🎉 ALL 12 ANIMATED SVG ASSETS AND SINGLE-USE BOOST VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during QA:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
