import { expect, test } from '@playwright/test';

test('failed ball-position save keeps the same draft and retry writes it once', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('futsal');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Equipe A controla' }).click();
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Controle observado: Equipe A/)).toHaveCount(1);

  await page.evaluate(() => {
    // The original method is called with the active store as its receiver below.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = IDBObjectStore.prototype.add;
    let failOnce = true;
    IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey) {
      const stored = value as { event?: { type?: string; fact?: { position?: unknown } } };
      if (failOnce && this.name === 'events' && stored.event?.type === 'futsal_fact_registered' && stored.event.fact?.position) {
        failOnce = false;
        throw new DOMException('Falha de teste', 'QuotaExceededError');
      }
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
  });

  const court = page.getByRole('application');
  const box = await court.boundingBox();
  if (!box) throw new Error('Quadra ausente');
  await court.click({ position: { x: box.width * .36, y: box.height * .42 } });
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Controle observado: Equipe A/)).toHaveCount(1);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(0);
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Controle observado: Equipe A/)).toHaveCount(2);
  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).click();
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Controle observado: Equipe A/)).toHaveCount(2);
});
