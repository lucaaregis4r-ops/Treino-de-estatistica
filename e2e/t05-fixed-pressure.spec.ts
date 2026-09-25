import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t05-fixed-pressure';

async function createFootballMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
}

async function markField(page: import('@playwright/test').Page, x = .5, y = .5) {
  const field = page.getByRole('application');
  const box = await field.boundingBox();
  if (!box) throw new Error('Campo não encontrado');
  await field.click({ position: { x: box.width * x, y: box.height * y } });
  await expect(page.getByText('Marco salvo.')).toBeVisible();
}

async function enablePressure(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
  await page.getByRole('button', { name: 'Pressão', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar pressão', exact: true }).click();
  await expect(page.getByLabel('Registro fixo de pressão')).toBeVisible();
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T05 saves a fixed pressure snapshot without inheriting its highlight and keeps shots primary', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);
  await page.getByRole('button', { name: 'Equipe A', exact: true }).click();
  await expect(page.getByText('Equipe A com a bola registrado.')).toBeVisible();
  await markField(page, .32, .45);
  await enablePressure(page);
  await expect(page.getByText('Equipe B pressiona')).toBeVisible();
  await page.getByRole('button', { name: 'Alta', exact: true }).click();
  await expect(page.getByText('Pressão Alta registrada.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alta', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await markField(page, .46, .52);
  await expect(page.getByRole('button', { name: 'Alta', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Alta', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Alta', exact: true })).toBeEnabled();
  await page.screenshot({ path: `${output}/pressure-1366x768.png`, fullPage: true });
});

test('T05 preserves the fixed-row preference, changes pressing team on control switch and fits mobile', async ({ page }) => {
  await createFootballMatch(page);
  await page.getByRole('button', { name: 'Equipe A', exact: true }).click();
  await expect(page.getByText('Equipe A com a bola registrado.')).toBeVisible();
  await markField(page, .3, .45);
  await enablePressure(page);
  await page.getByRole('button', { name: 'Sem pressão', exact: true }).click();
  await expect(page.getByText('Sem pressão observada registrada.')).toBeVisible();
  await page.reload();
  const resume = page.getByRole('button', { name: 'Continuar registro' });
  if (await resume.isVisible().catch(() => false)) await resume.click();
  await expect(page.getByLabel('Registro fixo de pressão')).toBeVisible();
  await page.getByRole('button', { name: 'Equipe B', exact: true }).click();
  await expect(page.getByText('Equipe B com a bola registrado.')).toBeVisible();
  await expect(page.getByText('Equipe A pressiona')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sem pressão', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/pressure-390x844.png`, fullPage: true });
});
