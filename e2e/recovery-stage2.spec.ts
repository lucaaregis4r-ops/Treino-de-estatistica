import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const artifacts = path.resolve('output/recovery-stage2');

test('football field remains visible, proportional and legible at target sizes', async ({ page }) => {
  fs.mkdirSync(artifacts, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByLabel('Nome da equipe').first().fill('Azul FC');
  await page.getByLabel('Nome da equipe').last().fill('Verde FC');
  const teamCards = page.locator('.team-form-card');
  const firstCard = await teamCards.nth(0).boundingBox();
  const secondCard = await teamCards.nth(1).boundingBox();
  expect(firstCard?.y).toBe(secondCard?.y);
  expect(firstCard?.width).toBeCloseTo(secondCard?.width ?? 0, 0);
  await expect(page.getByText(/Líbero|Quem começa sacando|P1/i)).toHaveCount(0);
  await page.screenshot({ path: path.join(artifacts, 'setup-football-1366x768.png') });
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByText('Registro de futebol')).toBeVisible();

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const field = page.getByLabel('Campo de futebol');
    await expect(field).toBeVisible();
    const bounds = await field.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width / bounds!.height).toBeCloseTo(1.5, 1);
    expect(bounds!.height).toBeGreaterThan(300);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: path.join(artifacts, `football-${viewport.width}x${viewport.height}.png`) });
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Inverter visualização' }).click();
  await expect(page.getByText('Verde FC · esquerda')).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'football-flipped-1366x768.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Campo de futebol')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(artifacts, 'football-mobile-390x844.png') });
});
