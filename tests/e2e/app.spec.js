import { test, expect } from '@playwright/test';
const nick=process.env.E2E_NICK, password=process.env.E2E_PASSWORD;

test('public shell renders custom UI without native selects', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('select')).toHaveCount(0);
  await expect(page.locator('text=English Flow').first()).toBeVisible();
});

test.skip(!nick||!password,'Set E2E_NICK and E2E_PASSWORD for authenticated UI tests');
test('auth -> dashboard -> lesson error state never spins forever', async ({page})=>{
  await page.goto('/');
  await page.locator('input[autocomplete=\"username\"]').fill(nick);
  await page.locator('input[autocomplete=\"current-password\"]').fill(password);
  await page.getByRole('button',{name:'Увійти',exact:true}).click();
  await expect(page.getByText(/Привіт,/)).toBeVisible({timeout:15000});
  await page.getByRole('button',{name:'Вчити'}).first().click();
  await expect(page.getByText(/Готуємо персональний урок|Не вдалося підготувати урок|У словнику немає/)).toBeVisible({timeout:15000});
  await page.waitForTimeout(16000);
  await expect(page.getByText(/Готуємо персональний урок…/)).toHaveCount(0);
});

test('about page contains current version and no PWA controls', async ({page})=>{
  await page.goto('/');
  const about=page.getByRole('button',{name:'Про додаток'});
  if(await about.count()){await about.click();await expect(page.getByText(/Версія інтерфейсу: v2\.6\.0/)).toBeVisible();await expect(page.getByText(/PWA|Встановити застосунок|Перевірити оновлення/)).toHaveCount(0)}
});
