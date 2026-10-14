import { expect, test } from '@playwright/test';

test('futsal analysis keeps readable cards and complete trajectories on desktop and mobile', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const newMatch = page.getByRole('button', { name: 'Nova partida' }).last();
  try { await expect(newMatch).toBeVisible({ timeout: 10_000 }); }
  catch { await page.reload(); await expect(newMatch).toBeVisible(); }
  await newMatch.click();
  await page.getByLabel('Modalidade').selectOption('futsal');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Análise' }).click();
  await expect(page.getByRole('heading', { name: 'Análise de futsal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Posses completas registradas' })).toBeVisible();
  const colors = await page.locator('.futsal-analysis-cards article').first().evaluate(element => {
    const card = getComputedStyle(element), tile = getComputedStyle(element.querySelector('dl div')!);
    const luminance = (color: string) => {
      const rgb = color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
      const linear = rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
      return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    };
    const contrast = (a: string, b: string) => { const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05); };
    return { card: card.backgroundColor, tile: tile.backgroundColor, cardContrast: contrast(card.backgroundColor, card.color), tileContrast: contrast(tile.backgroundColor, tile.color) };
  });
  expect(colors.card).not.toBe('rgb(255, 255, 255)');
  expect(colors.tile).not.toBe('rgb(255, 255, 255)');
  expect(colors.cardContrast).toBeGreaterThanOrEqual(4.5);
  expect(colors.tileContrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: '/tmp/scout-futsal-analysis-s3.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
