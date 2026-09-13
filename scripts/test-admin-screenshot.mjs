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

  // Click on Admin in sidebar
  const adminNav = page.locator('button:has-text("Адмін"), .sidebar button:has(.lucide-shield)').first();
  await adminNav.click();
  await page.waitForTimeout(1000);

  // Click quick tester bypass button
  const bypassBtn = page.locator('button:has-text("Швидкий вхід для тестувальника")').first();
  if (await bypassBtn.isVisible()) {
    await bypassBtn.click();
    await page.waitForTimeout(1200);
  }

  await page.screenshot({ path: 'C:/Users/mikol/.gemini/antigravity-ide/brain/0c568a31-bda6-4238-9197-c010b3b4c65e/agent_screenshots/agent9_admin_inside.png' });
  await browser.close();
  console.log('Admin inside screenshot saved successfully');
}

main().catch(console.error);
