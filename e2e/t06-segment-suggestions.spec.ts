import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t06-segment-suggestions';

async function createFootballMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
}

async function markField(page: import('@playwright/test').Page, x: number, y: number) {
  const field = page.getByRole('application');
  const box = await field.boundingBox();
  if (!box) throw new Error('Campo não encontrado');
  await field.click({ position: { x: box.width * x, y: box.height * y } });
  await expect(page.getByText('Marco salvo.')).toBeVisible();
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T06 keeps suggestions opt-in and shows one discreet current-area cue without blocking collection', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);
  const toggle = page.getByRole('button', { name: 'Sugerir trechos para completar', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Equipe A', exact: true }).click();
  await markField(page, .58, .12);
  await expect(page.locator('.football-suggested-segment')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await markField(page, .88, .25);
  await expect(page.locator('.football-suggested-segment')).toHaveCount(1);
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.locator('.football-suggested-segment')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.football-suggested-segment')).toHaveCount(1);
  await page.screenshot({ path: `${output}/suggestion-1366x768.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/suggestion-390x844.png`, fullPage: true });
});

test('T06 retains the opt-in choice across reload without exposing a premature review action', async ({ page }) => {
  await createFootballMatch(page);
  await page.getByRole('button', { name: 'Sugerir trechos para completar', exact: true }).click();
  await page.reload();
  const resume = page.getByRole('button', { name: 'Continuar registro' });
  if (await resume.isVisible().catch(() => false)) await resume.click();
  await expect(page.getByRole('button', { name: 'Sugerir trechos para completar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /revisar sugest/i })).toHaveCount(0);
});
