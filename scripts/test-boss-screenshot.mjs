import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const testerBtn = page.getByRole('button', { name: /Tester/i }).first();
  if (await testerBtn.isVisible()) {
    await testerBtn.click();
    await page.waitForTimeout(1000);
  }

  const challengesNav = page.locator('button:has-text("Challenges"), .sidebar button:has(.lucide-swords)').first();
  await challengesNav.click();
  await page.waitForTimeout(600);

  const eventsTab = page.locator('button:has-text("Епічні події")').first();
  if (await eventsTab.isVisible()) {
    await eventsTab.click();
    await page.waitForTimeout(400);
  }

  const bossBtn = page.locator('button:has-text("Розпочати битву з Босом"), button:has-text("Спробувати знову")').first();
  if (await bossBtn.isVisible()) {
    await bossBtn.click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e/agent_screenshots/agent5_boss_battle.png' });
  await browser.close();
  console.log('Boss battle screenshot saved successfully');
}

main().catch(console.error);
