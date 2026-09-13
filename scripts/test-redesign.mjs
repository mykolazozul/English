import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve('agent_screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function verifyLoginRedesign() {
  console.log('🎨 [Redesign QA] Verifying modern auth experience...\n');
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Test
  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  // Clear session so we always hit onboarding
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check new elements
  const card = page.locator('.auth-card-glass');
  console.log('  Checking .auth-card-glass presence...');
  if (await card.count() === 0) {
    throw new Error('.auth-card-glass not found!');
  }
  console.log('  ✅ Glassmorphic card rendered');

  const orbs = page.locator('.auth-ambient-orb');
  console.log(`  Checking ambient orbs (count: ${await orbs.count()})...`);
  if (await orbs.count() < 3) {
    throw new Error('Ambient orbs missing');
  }
  console.log('  ✅ Ambient aurora orbs rendered');

  // Take screenshot of Login mode (Desktop)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'redesign_01_desktop_login.png') });
  console.log('  📸 Captured redesign_01_desktop_login.png');

  // Test switching to Register
  const regBtn = page.locator('button.auth-seg-btn', { hasText: 'Реєстрація' });
  await regBtn.click();
  await page.waitForTimeout(500);

  const nameInput = page.locator('input[placeholder*="звертатися"]');
  if (await nameInput.count() === 0) {
    throw new Error('Name input for registration not shown');
  }
  console.log('  ✅ Segmented switch to Registration works');

  // Take screenshot of Register mode (Desktop)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'redesign_02_desktop_register.png') });
  console.log('  📸 Captured redesign_02_desktop_register.png');

  // Switch back to Login and test Password toggle
  const loginBtn = page.locator('button.auth-seg-btn', { hasText: 'Вхід' });
  await loginBtn.click();
  await page.waitForTimeout(400);

  const passInput = page.locator('input[autoComplete="current-password"]');
  await passInput.fill('TesterSecretPass123');
  
  const eyeBtn = page.locator('.auth-pass-toggle-btn');
  await eyeBtn.click();
  await page.waitForTimeout(300);

  const inputTypeRevealed = await passInput.getAttribute('type');
  if (inputTypeRevealed !== 'text') {
    throw new Error(`Expected input type text after eye click, got: ${inputTypeRevealed}`);
  }
  console.log('  ✅ Password reveal toggle works (type="text")');

  await eyeBtn.click();
  await page.waitForTimeout(300);
  const inputTypeHidden = await passInput.getAttribute('type');
  if (inputTypeHidden !== 'password') {
    throw new Error(`Expected input type password after eye click, got: ${inputTypeHidden}`);
  }
  console.log('  ✅ Password conceal toggle works (type="password")');

  // 2. Mobile Responsive Test (iPhone 14 / 390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'redesign_03_mobile_login.png') });
  console.log('  📸 Captured redesign_03_mobile_login.png');

  // 3. Test Successful Login
  const nickInput = page.locator('input[placeholder*="shadow_knight"]');
  await nickInput.fill('tester');
  await passInput.fill('Tester2026!');
  await page.locator('button.auth-hero-btn').click();
  await page.waitForTimeout(2000);

  const appSidebar = page.locator('aside.sidebar');
  if (await appSidebar.count() === 0) {
    throw new Error('Failed to log in to dashboard');
  }
  console.log('  ✅ Login as tester successful, dashboard loaded');

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'redesign_04_dashboard_after_login.png') });
  console.log('  📸 Captured redesign_04_dashboard_after_login.png');

  await browser.close();
  console.log('\n🎉 [Redesign QA] ALL VERIFICATION CHECKS PASSED!');
}

verifyLoginRedesign().catch(err => {
  console.error('Crash in verifyLoginRedesign:', err);
  process.exit(1);
});
