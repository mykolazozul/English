// Guest-mode click-through smoke test against a locally served build (no backend needed).
// Run:  npm run preview  (serves dist on:4173)  then  node tests/scripts/guest-clickthrough.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const problems = [];
const results = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => problems.push('PAGEERROR: ' + e.message));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  // Expected: no backend on preview — /api calls fail; those are caught app-side.
  if (!/\/api\//.test(t) && !/Failed to load resource|net::|favicon/.test(t)) {
    problems.push('CONSOLE: ' + t);
  }
});

async function nav(name) {
  try {
    const btn = page.getByRole('button', { name, exact: true }).first();
    if (await btn.count() === 0) { problems.push('NAV: button "' + name + '" not found'); return; }
    await btn.click();
    await page.waitForTimeout(300);
    results.push('nav ' + name + ': OK');
  } catch (e) { problems.push('NAV ' + name + ': ' + e.message.slice(0, 160)); }
}

await page.goto(BASE, { waitUntil: 'networkidle' });
results.push('loaded: ' + (await page.title()));

// Enter guest mode
await page.getByRole('button', { name: /Увійти як гість/ }).first().click();
await page.waitForTimeout(400);
const greeting = await page.getByText(/Привіт, Гість/).count();
results.push('guest greeting: ' + (greeting ? 'OK' : 'MISSING'));
if (!greeting) problems.push('guest greeting missing');

// Version badge on about
await nav('Про додаток');
const ver = await page.getByText(/v2\.6\.0/).count();
results.push('about version v2.6.0: ' + (ver ? 'OK' : 'MISSING'));
if (!ver) problems.push('version v2.6.0 missing on About');

// Visit every top-level page
await nav('Головна');
await nav('Навчання');
await nav('Слова');
await nav('SRS Повтор');
await nav('Статистика');
await nav('Бейджі');
await nav('Проблемні');
await nav('Рейтинг');
await nav('Challenges');
await nav('Друзі');
await nav('Налаштування');
await nav('Профіль');
await nav('Про додаток');

// Start a guest lesson (sprint) from the Learn page
await nav('Навчання');
try {
  await page.getByRole('button', { name: /Почати/ }).first().click();
  await page.waitForTimeout(500);
  // Inside SprintGame there is a numbered question / answer input or options; a back/exit control exists.
  const q = await page.locator('input, button').count();
  results.push('guest sprint quiz controls: ' + q);
  if (q === 0) problems.push('sprint lesson rendered no controls');
  const back = await page.getByRole('button', { name: /← Назад|Вийти/ }).count();
  if (back) await page.getByRole('button', { name: /← Назад|Вийти/ }).first().click();
} catch (e) { problems.push('guest sprint: ' + e.message.slice(0, 160)); }

await browser.close();

console.log('\n===== GUEST CLICK-THROUGH RESULTS =====');
results.forEach(r => console.log('  OK  ' + r));
console.log('---');
if (!problems.length) console.log('  ALL OK — no runtime errors');
else { console.log('PROBLEMS (' + problems.length + '):'); problems.forEach(p => console.log('  ✗ ' + p)); process.exitCode = 1; }