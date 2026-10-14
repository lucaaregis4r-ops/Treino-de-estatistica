import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test('touch records ball, and F/V/R/T/Escape shortcuts keep their action shapes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('futsal');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Equipe A controla' }).click();
  const court = page.getByRole('application');
  const touchAt = async (x: number, y: number) => {
    const box = await court.boundingBox();
    if (!box) throw new Error('Quadra ausente');
    await court.tap({ position: { x: box.width * x, y: box.height * y } });
  };
  await touchAt(.35, .45);
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Controle observado: Equipe A/)).toHaveCount(2);

  await page.keyboard.press('f');
  await expect(page.getByRole('button', { name: 'Preparar finalização' })).toHaveAttribute('aria-pressed', 'true');
  await touchAt(.7, .5);
  await touchAt(.85, .5);
  await page.getByRole('button', { name: 'Defendida' }).click();
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Finalização de Equipe A · Defendida/)).toBeVisible();

  await page.keyboard.press('v');
  await touchAt(.4, .6);
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Falta de Equipe A/)).toBeVisible();
  await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Preparar reinício' })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('r');
  await touchAt(.2, .3);
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Reinício: Lateral/)).toBeVisible();

  await page.getByRole('button', { name: 'Mais' }).click();
  await page.keyboard.press('t');
  await expect(page.getByRole('button', { name: 'Pausar relógio (T)' })).toBeVisible();
});
