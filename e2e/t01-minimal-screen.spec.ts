import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t01-minimal-screen';

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
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T01 starts with the separate minimum recorder, persists one touch and reloads confirmed state', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);

  await expect(page.getByRole('button', { name: 'Modo detalhado', exact: true })).toBeVisible();
  await expect(page.getByLabel('Atleta (opcional)')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Finalização', exact: true })).toHaveCount(0);
  await expect(page.getByText('Controle não observado')).toBeVisible();
  await markField(page, .28, .48);
  await expect(page.getByText('Marco salvo.')).toBeVisible();
  await expect(page.getByText(/Última posição observada há/)).toBeVisible();
  await page.screenshot({ path: `${output}/minimum-1366x768.png`, fullPage: true });

  const field = page.getByRole('application');
  await field.focus();
  await field.press('ArrowRight');
  await field.press('Enter');
  await expect(page.getByText('Marco salvo.')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.getByText('Último registro desfeito.')).toBeVisible();

  await page.reload();
  const resume = page.getByRole('button', { name: 'Continuar registro' });
  if (await resume.isVisible().catch(() => false)) await resume.click();
  await expect(page.getByText(/Última posição observada há/)).toBeVisible();
  await expect(page.getByLabel('Atleta (opcional)')).toHaveCount(0);
});

test('T01 keeps the minimal field and commands within desktop and mobile viewports', async ({ page }) => {
  await createFootballMatch(page);
  for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('application')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `${output}/minimum-${viewport.width}x${viewport.height}.png`, fullPage: true });
  }
});
