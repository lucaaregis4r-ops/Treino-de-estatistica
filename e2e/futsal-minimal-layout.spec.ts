import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`futsal essentials fit the first viewport at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Nova partida' }).last().click();
    await page.getByLabel('Modalidade').selectOption('futsal');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();

    for (const label of ['Relógio da partida', 'Controle da bola', 'Quadra de futsal para registrar localização', 'Ações principais']) {
      const box = await page.getByLabel(label, { exact: true }).boundingBox();
      expect(box, `${label} sem caixa visível`).not.toBeNull();
      expect(box!.y + box!.height, `${label} fora do primeiro viewport`).toBeLessThanOrEqual(viewport.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('futsal-first-viewport.png'), fullPage: false });
  });
}
