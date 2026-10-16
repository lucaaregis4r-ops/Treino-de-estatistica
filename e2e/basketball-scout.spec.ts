import { expect, test, type Page } from '@playwright/test';

async function openBasketballMatch(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Basquete: abrir partidas e manual' }).click();
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByRole('heading', { name: 'Quadra e Posse de Jogo' })).toBeVisible();
}

test('basquete registra e corrige arremessos sem rolagem horizontal', async ({ page }) => {
  test.setTimeout(120_000);
  await openBasketballMatch(page);

  for (const width of [1366, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const court = await page.getByRole('region', { name: /Quadra interativa de basquete/ }).boundingBox();
    if (!court) throw new Error('Quadra interativa ausente.');
    expect(court.width / court.height).toBeCloseTo(28 / 15, 1);
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('*')]
        .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 8)
        .map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
    }));
    expect(overflow.document, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
  }

  await page.setViewportSize({ width: 1366, height: 844 });
  const court = page.getByRole('region', { name: /Quadra interativa de basquete/ });
  await court.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.basketball-location-pin')).toBeVisible();
  await page.getByRole('group', { name: 'Pontuação do arremesso' }).getByRole('button', { name: '3 pts' }).click();
  await page.getByRole('button', { name: /CESTA.*\+3 pts/ }).click();
  await expect(page.getByLabel('Placar da partida')).toContainText('3');

  await page.getByRole('button', { name: /Perda de Posse/ }).click();
  await page.getByRole('button', { name: /Histórico/ }).click();
  await expect(page.getByRole('heading', { name: 'Lances registrados' })).toBeVisible();
  await page.getByRole('button', { name: 'Corrigir' }).last().click();
  await page.getByRole('button', { name: /ERRO.*Rebote em disputa/ }).click();
  await expect(page.getByLabel('Placar da partida')).toContainText('0');

  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumo e análise' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mapa de ações e calor' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Caminhos táticos observados e finalizações' })).toBeVisible();
  await page.getByRole('region', { name: 'Mapas de ações do basquete' }).getByRole('button', { name: 'Calor' }).click();
  await expect(page.getByRole('img', { name: 'Mapa de calor das ações registradas na quadra de basquete' })).toBeVisible();
  for (const width of [1366, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('basquete ajusta relógios, registra rebote ofensivo e configura atalho', async ({ page }) => {
  test.setTimeout(120_000);
  await openBasketballMatch(page);
  await page.getByRole('button', { name: /Ajustar/ }).click();
  await page.getByLabel('Minutos do quarto').fill('9');
  await page.getByLabel('Segundos do quarto').fill('48');
  await page.getByRole('region', { name: 'Ajustar relógios' }).getByLabel('Relógio de arremesso').fill('16');
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByLabel('Tempo do período')).toHaveText('09:48');
  await expect(page.getByLabel('Relógio de arremesso')).toHaveText('16');

  await page.getByRole('button', { name: /Reb Of/ }).click();
  await expect(page.getByLabel('Relógio de arremesso')).toHaveText('14');
  await page.getByRole('button', { name: 'Atalhos' }).click();
  await page.getByLabel('Atalho: Perda').fill('K');
  await page.getByRole('button', { name: 'Quadra Tática' }).click();
  await page.keyboard.press('K');
  await page.keyboard.press('R');
  await page.getByRole('button', { name: /Histórico/ }).click();
  await expect(page.locator('.basketball-history li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ritmo das posses' })).toBeVisible();
});
