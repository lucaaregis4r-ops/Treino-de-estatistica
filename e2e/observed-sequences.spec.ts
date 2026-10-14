import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

test('volleyball rally remains inspectable and exportable after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).last().click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();

  const code = page.getByLabel('Digite o código');
  await code.fill('*01S#');
  await code.press('Enter');
  await expect(page.locator('.event-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rallies completos registrados' })).toBeVisible();
  await expect(page.locator('.observed-unit')).toHaveCount(1);
  await page.locator('.observed-unit summary').click();
  const sourceLabel = await page.locator('.observed-unit li a').first().textContent();
  const sourceId = sourceLabel?.replace(/^registro original /, '');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar trajetórias JSON' }).click();
  const file = await download;
  const filePath = await file.path();
  if (!filePath) throw new Error('Exportação da trajetória não gerou arquivo.');
  const exported = await fs.readFile(filePath, 'utf8');
  expect(exported).toContain(sourceId ?? 'volleyball:');

  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).click();
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.locator('.observed-unit')).toHaveCount(1);
  await page.locator('.observed-unit summary').click();
  await expect(page.locator('.observed-unit li a').first()).toHaveText(`registro original ${sourceId ?? ''}`);
});

test('football possession keeps its full observed path through export and reload', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Equipe A', exact: true }).click();
  await page.getByRole('button', { name: 'Equipe B', exact: true }).click();

  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Posses completas registradas' })).toBeVisible();
  await expect(page.locator('.observed-unit')).toHaveCount(1);
  await page.locator('.observed-unit summary').click();
  const sourceLabels = await page.locator('.observed-unit li a').allTextContents();
  expect(sourceLabels.length).toBeGreaterThanOrEqual(1);
  const sourceId = sourceLabels[0].replace(/^registro original /, '');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar trajetórias CSV' }).click();
  const file = await download;
  const filePath = await file.path();
  if (!filePath) throw new Error('Exportação da posse não gerou arquivo.');
  const exported = await fs.readFile(filePath, 'utf8');
  expect(exported).toContain(sourceId);

  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).click();
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.locator('.observed-unit')).toHaveCount(1);
  await page.locator('.observed-unit summary').click();
  await expect(page.locator('.observed-unit li a').first()).toHaveText(`registro original ${sourceId}`);
});
