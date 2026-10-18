import { test, expect } from '@playwright/test';
const nick = process.env.E2E_NICK || 'tester';
const password = process.env.E2E_PASSWORD || 'Tester2026!';

test('public shell renders custom UI without native selects', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
  await expect(page.locator('.version-badge')).toContainText('v3.8.0');
});

test('auth -> dashboard -> lesson navigation works smoothly', async ({page})=>{
  await page.goto('/');
  await page.locator('input[autocomplete="username"]').fill(nick);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button',{name:/Увійти/i}).first().click();
  await expect(page.getByText(/Привіт,|Камінний Храм/).first()).toBeVisible({timeout:15000});
  await page.getByRole('button',{name:/Вчити/i}).first().click();
  await expect(page.getByText(/Навчання|Свайп-картки слів|Vocabulary Sprint/).first()).toBeVisible({timeout:15000});
});

test('about page contains current version and no PWA controls', async ({page})=>{
  await page.goto('/');
  await page.locator('input[autocomplete="username"]').fill(nick);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button',{name:/Увійти/i}).first().click();
  await expect(page.locator('.version-badge')).toContainText('v3.8.0');
  const about = page.getByRole('button',{name:/Про додаток|Про сайт/i}).first();
  if (await about.count()) {
    await about.click();
    await expect(page.getByText(/Версія: v3\.8\.0/)).toBeVisible();
    await expect(page.getByText(/PWA|Встановити застосунок|Перевірити оновлення/)).toHaveCount(0);
  }
});
