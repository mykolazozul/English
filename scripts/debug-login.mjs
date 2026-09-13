import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(1000);

  const nick = page.locator('input').first();
  const pass = page.locator('input[type="password"]').first();
  await nick.fill('tester');
  await pass.fill('Tester2026!');
  await page.locator('button', { hasText: /Увійти/i }).first().click();
  await page.waitForTimeout(2500);

  const text = await page.innerText('body');
  console.log('Body Text after login (first 500 chars):\n', text.slice(0, 500));
  await browser.close();
}

check();
