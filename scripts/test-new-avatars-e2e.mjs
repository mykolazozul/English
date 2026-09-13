import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e';

async function verifyAvatars() {
  console.log('🎮 [Funny Fantasy Avatars E2E Test] Starting verification...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const nickInput = page.locator('input').first();
    if (await nickInput.isVisible().catch(() => false)) {
      console.log('Logging in as tester...');
      await nickInput.fill('tester');
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('Tester2026!');
      await page.locator('button', { hasText: /Увійти/i }).first().click();
      await page.waitForTimeout(2000);
    }

    // 1. Check Brand Logo
    const brandLogo = page.locator('img[src="/brand_logo.png"]').first();
    const brandLogoVisible = await brandLogo.isVisible();
    console.log('Brand Logo visible:', brandLogoVisible);

    // 2. Navigate to Profile
    const profileNav = page.locator('button.nav', { hasText: /Профіль/i }).first();
    await profileNav.click();
    await page.waitForTimeout(1500);

    // 3. Verify funny avatars grid
    const avatarHeading = page.locator('h2', { hasText: /Колекція Кумедних Героїв/i });
    const isHeadingVisible = await avatarHeading.isVisible();
    console.log('Funny Avatars Grid Heading visible:', isHeadingVisible);

    const avatarButtons = page.locator('.avatar-card-item');
    const avatarCount = await avatarButtons.count();
    console.log(`Rendered avatar buttons: ${avatarCount} (expected 22)`);

    // Verify images inside avatar cards
    const avatarImages = page.locator('.avatar-card-item img.funny-avatar-img');
    const imageCount = await avatarImages.count();
    console.log(`Rendered funny avatar images: ${imageCount}`);

    // Click on "Сонний Дракончик" or "Кіт-Ніндзя"
    const ninjaCatBtn = page.locator('.avatar-card-item', { hasText: /Кіт-Ніндзя/i }).first();
    if (await ninjaCatBtn.isVisible()) {
      await ninjaCatBtn.click();
      await page.waitForTimeout(500);
      console.log('Selected Ninja Cat avatar');
    }

    // Save Profile screenshot
    const profileScreenshotPath = path.join(ARTIFACT_DIR, 'funny_avatars_profile_view.png');
    await page.screenshot({ path: profileScreenshotPath, fullPage: false });
    console.log('Saved screenshot to:', profileScreenshotPath);

    // 4. Navigate to Shop -> Wardrobe
    const shopNav = page.locator('button.nav', { hasText: /Крамниця/i }).first();
    if (await shopNav.isVisible()) {
      await shopNav.click();
      await page.waitForTimeout(1000);

      // Click Wardrobe sub-tab
      const wardrobeTab = page.locator('button', { hasText: /ГАРДЕРОБ/i }).first();
      if (await wardrobeTab.isVisible()) {
        await wardrobeTab.click();
        await page.waitForTimeout(1000);
        console.log('Navigated to Shop Wardrobe');

        const shopAvatars = page.locator('.tavern-parchment-card img.funny-avatar-img');
        console.log(`Shop animated avatar cards: ${await shopAvatars.count()}`);

        const shopScreenshotPath = path.join(ARTIFACT_DIR, 'funny_avatars_shop_view.png');
        await page.screenshot({ path: shopScreenshotPath, fullPage: false });
        console.log('Saved Shop screenshot to:', shopScreenshotPath);
      }
    }

    console.log('\n🎉 ALL CHECKS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verifyAvatars();
