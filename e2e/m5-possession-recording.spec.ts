import { expect, test } from '@playwright/test';

async function createFootballMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Modo detalhado', exact: true }).click();
}

async function clickPitch(page: import('@playwright/test').Page, x: number, y: number) {
  const pitch = page.getByRole('application');
  const box = await pitch.boundingBox();
  if (!box) throw new Error('Campo não encontrado');
  await pitch.click({ position: { x: box.width * x, y: box.height * y } });
}

test('records possession marks from the field, persists them, and keeps loss and shots detailed', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);

  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await page.getByRole('button', { name: 'Observar continuamente' }).click();
  await expect(page.getByText('Observação contínua iniciada. Clique no campo para registrar marcos.')).toBeVisible();

  await clickPitch(page, .25, .45);
  await expect(page.getByText('Marco por posse salvo.')).toBeVisible();
  await expect(page.locator('.football-history li')).toHaveCount(2);
  await expect(page.locator('.football-possession-strip')).toContainText('Última posição');

  const firstTeam = page.locator('.football-control-bar button').first();
  await firstTeam.click();
  await expect(page.getByText(/Pronto para registrar:/)).toBeVisible();
  await clickPitch(page, .62, .35);
  await expect(page.getByText('Marco por posse salvo.')).toBeVisible();
  await expect(page.locator('.football-history li')).toHaveCount(3);
  await expect(page.locator('.football-possession-strip')).toContainText('com a bola');

  await page.getByRole('button', { name: 'Em disputa', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar controle sem posição' }).click();
  await expect(page.locator('.football-history li')).toHaveCount(4);
  await expect(page.locator('.football-history li').first()).toContainText('Observação de controle');

  await page.getByRole('button', { name: 'Perda', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar evento' }).click();
  await expect(page.locator('.football-history li')).toHaveCount(5);
  await expect(page.locator('.football-history li').first()).toContainText('Dispossessed');

  for (const result of ['Defendida', 'Bloqueada']) {
    await page.getByRole('button', { name: 'Finalização', exact: true }).click();
    await page.getByRole('button', { name: result, exact: true }).click();
    await clickPitch(page, .78, .5);
    await page.getByRole('button', { name: 'Confirmar evento' }).click();
  }
  await expect(page.locator('.football-history li')).toHaveCount(7);

  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).click();
  await page.getByRole('button', { name: 'Modo detalhado', exact: true }).click();
  await expect(page.locator('.football-history li')).toHaveCount(7);
  await expect(page.locator('.football-recent-marker')).toHaveCount(2);
});

test('possession recorder stays horizontally contained at desktop and mobile breakpoints', async ({ page }) => {
  await createFootballMatch(page);
  await page.getByRole('button', { name: 'Observar continuamente' }).click();
  for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('application')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test('records a possession mark with touch input on mobile', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await createFootballMatch(page);
    await page.getByRole('button', { name: 'Observar continuamente' }).click();
    await page.getByRole('application').tap({ position: { x: 130, y: 120 } });
    await expect(page.getByText('Marco por posse salvo.')).toBeVisible();
    await expect(page.locator('.football-history li')).toHaveCount(2);
  } finally {
    await context.close();
  }
});
