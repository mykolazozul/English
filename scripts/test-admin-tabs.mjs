import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    errors.push(err.message + '\n' + err.stack);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Login as tester
  const testerBtn = page.getByRole('button', { name: /Tester/i }).first();
  if (await testerBtn.isVisible()) {
    await testerBtn.click();
    await page.waitForTimeout(1000);
  }

  // Go to Admin
  const adminNav = page.locator('button:has-text("Адмін"), .sidebar button:has(.lucide-shield)').first();
  await adminNav.click();
  await page.waitForTimeout(1000);

  // Bypass vault
  const bypassBtn = page.locator('button:has-text("Швидкий вхід для тестувальника")').first();
  if (await bypassBtn.isVisible()) {
    await bypassBtn.click();
    await page.waitForTimeout(1000);
  }

  const tabs = [
    'Словник Notion',
    'Користувачі',
    'Аналітика',
    'Безпека & 2FA',
    'Правила уроків',
    'Огляд та Стан'
  ];

  for (const t of tabs) {
    console.log(`Clicking tab: ${t}`);
    const btn = page.locator(`button:has-text("${t}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
      const errBox = page.locator('text=Щось пішло не так у цьому блоці');
      if (await errBox.isVisible()) {
        console.error(`💥 CRASH in tab "${t}"! Text on page:`, await page.locator('.error-boundary').textContent().catch(() => ''));
      } else {
        console.log(`✓ Tab "${t}" rendered OK`);
      }
    } else {
      console.warn(`Tab button "${t}" not visible`);
    }
  }

  if (errors.length) {
    console.log('--- Page Errors Captured ---');
    errors.forEach(e => console.error(e));
  } else {
    console.log('Zero runtime errors detected in tabs!');
  }

  await browser.close();
}

main().catch(console.error);
