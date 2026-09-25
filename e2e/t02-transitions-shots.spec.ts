import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t02-transitions-shots';

async function createFootballMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
}

async function clickField(page: import('@playwright/test').Page, x = .6, y = .45) {
  const field = page.getByRole('application');
  const box = await field.boundingBox();
  if (!box) throw new Error('Campo não encontrado');
  await field.click({ position: { x: box.width * x, y: box.height * y } });
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T02 records immediate changes, pending and completed shots without retrospectively changing current control', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);
  const teamA = page.getByRole('button', { name: 'Equipe A', exact: true });
  const teamB = page.getByRole('button', { name: 'Equipe B', exact: true });

  await teamA.click();
  await expect(page.getByText('Equipe A com a bola registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await clickField(page, .72, .45);
  await page.getByRole('button', { name: 'Defendida', exact: true }).click();
  await expect(page.getByText('Finalização registrada: Defendida.')).toBeVisible();

  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('button', { name: 'Origem não observada', exact: true }).click();
  await page.getByRole('button', { name: 'Depois', exact: true }).click();
  await expect(page.getByText('Chute salvo; resultado para revisar depois.')).toBeVisible();
  await teamB.click();
  await expect(page.getByText('Equipe B com a bola registrado.')).toBeVisible();
  await page.getByRole('button', { name: /Chute 00:00/ }).click();
  await page.getByRole('button', { name: 'Gol', exact: true }).click();
  await expect(page.getByText(/Resultado do chute de 00:00: Gol/)).toBeVisible();
  await expect(page.locator('.football-minimal-score strong')).toHaveText('1 × 0');
  await expect(page.getByText('Equipe B com a bola')).toBeVisible();

  for (const result of ['Bloqueada', 'Trave']) {
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await clickField(page);
    await page.getByRole('button', { name: result, exact: true }).click();
  }
  await expect(page.getByText('Finalização registrada: Trave.')).toBeVisible();
  await page.screenshot({ path: `${output}/shots-1366x768.png`, fullPage: true });
});

test('T02 treats dispute, stop/restart, pause and Escape as explicit state changes', async ({ page }) => {
  await createFootballMatch(page);
  const teamA = page.getByRole('button', { name: 'Equipe A', exact: true });
  await teamA.click();
  await page.getByRole('button', { name: 'Disputa', exact: true }).click();
  await expect(page.getByText('Bola em disputa registrado.')).toBeVisible();
  await teamA.click();
  await expect(page.getByText('Equipe A com a bola registrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Parada', exact: true }).click();
  await expect(page.getByText('Bola parada registrado.')).toBeVisible();
  await teamA.click();
  await expect(page.getByText('Reinício registrado.')).toBeVisible();
  await teamA.click();
  await expect(page.getByText('A mesma equipe continua com a bola; nenhuma nova posse foi criada.')).toBeVisible();

  await page.getByRole('button', { name: 'Pausar coleta', exact: true }).click();
  await expect(page.getByText('Coleta pausada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('application')).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Retomar coleta', exact: true }).click();
  await expect(page.getByText('Selecione a equipe que controla a bola para retomar a coleta.')).toBeVisible();
  await page.getByRole('button', { name: 'Equipe B', exact: true }).click();
  await expect(page.getByText('Equipe B com a bola registrado.')).toBeVisible();

  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('application').press('Escape');
  await expect(page.getByText('Intenção de finalização cancelada.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Origem não observada', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/states-390x844.png`, fullPage: true });
});
