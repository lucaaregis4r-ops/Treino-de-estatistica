import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const artifacts = path.resolve('output/recovery-stage5');

async function createFootball(page: import('@playwright/test').Page, roster = '') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByLabel('Nome da equipe').first().fill('Azul FC');
  await page.getByLabel('Nome da equipe').last().fill('Verde FC');
  if (roster) await page.getByLabel('Atletas (camisa e nome)').first().fill(roster);
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
}

test.beforeEach(() => fs.mkdirSync(artifacts, { recursive: true }));

test('field stays visible before and after capture, with roster, resize and inversion', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootball(page, '9 Ana Souza');
  const surface = page.getByLabel('Campo de futebol');
  await expect(surface).toBeVisible();
  await expect(page.getByRole('application')).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('Atleta (opcional)').selectOption({ label: '#9 Ana Souza' });
  await page.getByRole('button', { name: 'Recuperação' }).click();
  await page.getByRole('button', { name: 'Observada' }).click();
  const frame = page.getByRole('application');
  const bounds = await frame.boundingBox(); if (!bounds) throw new Error('Campo indisponível');
  await frame.click({ position: { x: bounds.width * .25, y: bounds.height * .4 } });
  await page.getByRole('button', { name: 'Confirmar evento' }).click();
  await expect(page.locator('.football-history li')).toHaveCount(1);
  await expect(surface).toBeVisible();
  await expect(page.getByRole('application')).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Inverter visualização' }).click();
  await expect(page.getByText('Verde FC · esquerda')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(surface).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(artifacts, 'field-persistent-mobile-390x844.png'), fullPage: true });
});

test('persistence failure stays visible and preserves the football draft', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootball(page);
  await page.getByRole('button', { name: 'Recuperação' }).click();
  await page.getByRole('button', { name: 'Observada' }).click();
  const frame = page.getByRole('application');
  const bounds = await frame.boundingBox(); if (!bounds) throw new Error('Campo indisponível');
  await frame.click({ position: { x: bounds.width * .3, y: bounds.height * .4 } });
  await page.evaluate(() => {
    // The native method must be invoked with the current object store as `this`.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey) {
      if (this.name === 'events') throw new DOMException('Falha simulada', 'QuotaExceededError');
      return original.call(this, value, key);
    };
  });
  await page.getByRole('button', { name: 'Confirmar evento' }).click();
  await expect(page.getByText('Não foi possível salvar. O rascunho foi preservado para tentar novamente.')).toBeVisible();
  await expect(page.locator('.football-history li')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirmar evento' })).toBeEnabled();
  await expect(page.locator('.football-marker').first()).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'persistence-failure-draft-preserved-1366x768.png') });
});

test('existing volleyball registration, score, court and reopen remain functional', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await expect(page.getByLabel('Modalidade')).toHaveValue('volleyball');
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  await expect(page.getByRole('article', { name: 'Quadra de Equipe A' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Quadra de Equipe B' })).toBeVisible();
  const input = page.getByLabel('Digite o código');
  await input.fill('*01S#');
  await input.press('Enter');
  await expect(page.locator('.event-list code')).toContainText('*01S#');
  await expect(page.locator('.match-workspace-score')).toContainText('1');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).click();
  await expect(page.locator('.event-list code')).toContainText('*01S#');
  await expect(page.getByRole('article', { name: 'Quadra de Equipe A' })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'volleyball-regression-1366x768.png') });
});
