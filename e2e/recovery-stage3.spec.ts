import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const artifacts = path.resolve('output/recovery-stage3');

test('football draft confirms once, cancels safely and reconciles a goal undo', async ({ page }) => {
  fs.mkdirSync(artifacts, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByLabel('Nome da equipe').first().fill('Azul FC');
  await page.getByLabel('Nome da equipe').last().fill('Verde FC');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();

  await page.getByRole('button', { name: 'Passe', exact: true }).click();
  const field = page.getByRole('application', { name: 'Campo: clique origem e destino ou arraste' });
  const bounds = await field.boundingBox();
  if (!bounds) throw new Error('Campo indisponível');
  await page.getByRole('button', { name: 'Completo', exact: true }).click();
  await field.click({ position: { x: bounds.width * .2, y: bounds.height * .3 } });
  await field.click({ position: { x: bounds.width * .5, y: bounds.height * .5 } });
  await page.getByRole('button', { name: 'Confirmar evento' }).click();
  await expect(page.locator('.football-history li')).toHaveCount(1);
  await expect(page.locator('.football-history')).toContainText('Pass');

  await page.getByRole('button', { name: 'Passe', exact: true }).click();
  await page.getByRole('button', { name: 'Incompleto', exact: true }).click();
  await field.click({ position: { x: bounds.width * .4, y: bounds.height * .4 } });
  await field.click({ position: { x: bounds.width * .7, y: bounds.height * .2 } });
  await page.getByRole('button', { name: 'Cancelar evento' }).click();
  await expect(page.locator('.football-history li')).toHaveCount(1);

  await page.getByRole('button', { name: 'Finalização' }).click();
  await page.getByRole('button', { name: 'Gol', exact: true }).click();
  await field.click({ position: { x: bounds.width * .85, y: bounds.height * .5 } });
  await page.getByRole('button', { name: 'Confirmar evento' }).click();
  await expect(page.locator('.match-workspace-score b').first()).toHaveText('1');
  await expect(page.locator('.football-history li')).toHaveCount(2);
  await page.screenshot({ path: path.join(artifacts, 'goal-confirmed-1366x768.png') });

  await page.getByRole('button', { name: 'Desfazer último evento' }).click();
  await expect(page.locator('.match-workspace-score b').first()).toHaveText('0');
  await expect(page.locator('.football-history li')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).click();
  await expect(page.locator('.football-history li')).toHaveCount(1);
  await expect(page.locator('.match-workspace-score b').first()).toHaveText('0');
  await page.screenshot({ path: path.join(artifacts, 'after-undo-reload-1366x768.png') });
});
