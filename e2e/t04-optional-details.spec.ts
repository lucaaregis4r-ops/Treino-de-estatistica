import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t04-optional-details';

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

async function controlAndPoint(page: import('@playwright/test').Page, team: string, x = .5) {
  await page.getByRole('button', { name: team, exact: true }).click();
  await expect(page.getByText(`${team} com a bola registrado.`)).toBeVisible();
  await markField(page, x, .45);
  await expect(page.getByText('Marco salvo.')).toBeVisible();
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T04 records optional details against the current point without blocking the minimum recorder', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);
  await controlAndPoint(page, 'Equipe A', .3);

  await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pressão', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roubada', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Jogador', exact: true }).click();
  await page.getByRole('button', { name: 'Não identificado', exact: true }).click();
  await expect(page.getByText('Jogador deste ponto registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.getByText('Último registro desfeito.')).toBeVisible();

  await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
  await page.getByRole('button', { name: 'Saída', exact: true }).click();
  await page.getByRole('button', { name: 'Transição', exact: true }).click();
  await expect(page.getByText('Saída registrado.')).toBeVisible();
  await markField(page, .52, .55);
  await expect(page.getByText('Marco salvo.')).toBeVisible();
  await page.screenshot({ path: `${output}/details-1366x768.png`, fullPage: true });
});

test('T04 enables a robbery only for the retained opponent-control change and fits mobile', async ({ page }) => {
  await createFootballMatch(page);
  await controlAndPoint(page, 'Equipe A', .3);
  await page.getByRole('button', { name: 'Disputa', exact: true }).click();
  await expect(page.getByText('Bola em disputa registrado.')).toBeVisible();
  await controlAndPoint(page, 'Equipe B', .7);
  await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Roubada', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Roubada', exact: true }).click();
  await page.getByRole('button', { name: 'Interceptação', exact: true }).click();
  await expect(page.getByText('Roubada registrado.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Detalhes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pressão', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/details-390x844.png`, fullPage: true });
});
