import { expect, test } from '@playwright/test';

test('football tackle changes possession without rotating the pitch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByLabel('Controle observado').getByRole('button', { name: 'Equipe A' }).click();
  const field = page.getByRole('application');
  const flipped = await page.locator('.football-surface').getAttribute('data-flipped');
  await page.keyboard.press('t');
  await field.click({ position: { x: 200, y: 130 } });
  await expect(page.getByText('Equipe B com a bola', { exact: true })).toBeVisible();
  expect(await page.locator('.football-surface').getAttribute('data-flipped')).toBe(flipped);
});

test('futsal tackle uses one point, transfers possession and keeps the court fixed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('futsal');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Equipe A controla' }).click();
  const court = page.getByRole('application');
  await court.click({ position: { x: 180, y: 100 } });
  await expect(page.getByText(/Equipe A com a bola/)).toBeVisible();
  const flipped = await page.locator('.futsal-surface').getAttribute('data-flipped');
  await page.keyboard.press('d');
  await court.click({ position: { x: 210, y: 100 } });
  await expect(page.getByText(/Equipe B com a bola/)).toBeVisible();
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Desarme de Equipe B/)).toBeVisible();
  expect(await page.locator('.futsal-surface').getAttribute('data-flipped')).toBe(flipped);
  await page.getByRole('button', { name: 'Equipe A controla' }).click();
  await court.click({ position: { x: 240, y: 100 } });
  await expect(page.getByText(/Equipe A com a bola/)).toBeVisible();
  expect(await page.locator('.futsal-surface').getAttribute('data-flipped')).toBe(flipped);
});
