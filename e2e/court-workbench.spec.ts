import { expect, test } from '@playwright/test';

test('quadra, zonas, atleta, registro e navegação preservam o fluxo', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles('e2e/fixtures/court-workbench.json');
  await expect(page.locator('.gesture-court')).toBeVisible();
  await page.locator('.app-message button').click();
  const surface = page.locator('.gesture-court .spatial-v2-surface');
  await expect(surface.locator('.volleyball-sector')).toHaveCount(12);
  const bounds = await surface.boundingBox();
  if (!bounds) throw new Error('Quadra não encontrada');
  await page.mouse.move(bounds.x + bounds.width * .375, bounds.y + bounds.height / 6);
  await expect(page.locator('.gesture-court-hint')).toContainText('Zona 4 · Entrada de rede · Serra Vôlei');
  await expect(surface.locator('.volleyball-sector.is-active')).toHaveCount(1);
  await page.getByRole('group', { name: 'Fundamento da ação' }).getByRole('button', { name: 'Ataque', exact: true }).click();
  await page.getByRole('group', { name: 'Selecionar atleta' }).locator('[data-position="4"]').click();
  await expect(page.locator('.gesture-scout-status')).toContainText('Elisa Silva');
  await page.getByRole('button', { name: /Qualidade #/ }).click();
  await page.mouse.move(bounds.x + bounds.width * .375, bounds.y + bounds.height / 6);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .875, bounds.y + bounds.height * 5 / 6, { steps: 5 });
  await page.mouse.up();
  await expect(surface.locator('.spatial-v2-marker')).toHaveCount(2);
  // Switching jobs must preserve the pending trajectory and selected athlete.
  const nav = page.getByRole('navigation', { name: 'Ferramentas de registro' });
  await nav.getByRole('button', { name: 'Campos e código', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Registro por campos e código associado' })).toBeVisible();
  await nav.getByRole('button', { name: 'Quadra', exact: true }).click();
  await expect(surface.locator('.spatial-v2-marker')).toHaveCount(2);
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
  await expect(page.locator('.court-receipt')).toContainText('Ataque · #5 Elisa Silva');
  await expect(page.locator('.court-receipt')).toHaveAttribute('data-fresh', 'true');
  await nav.getByRole('button', { name: /Histórico/ }).click();
  await expect(page.getByRole('heading', { name: 'Últimos eventos' })).toBeVisible();
  await nav.getByRole('button', { name: 'Escalações', exact: true }).click();
  await expect(page.locator('.court-lineup').first()).toBeVisible();
  expect(await page.locator('.court-lineup').last().locator('.rotation-court li').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-position')))).toEqual(['4', '3', '2', '5', '6', '1']);
  await nav.getByRole('button', { name: 'Quadra', exact: true }).click();
  await page.getByRole('button', { name: 'Ajustes da partida', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Ajustes da partida' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ajustes da partida', exact: true })).toBeFocused();
  if (await page.locator('.app-message button').isVisible()) await page.locator('.app-message button').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1366, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `output/court-redesign/quadra-${width}.png`, fullPage: true });
  }
});

test('teclado desenha sem salvar antes da confirmação', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles('e2e/fixtures/court-workbench.json');
  const court = page.getByRole('application');
  await court.focus();
  await court.press('ArrowLeft');
  await court.press('Enter');
  await court.press('ArrowRight');
  await court.press('ArrowRight');
  await court.press('Enter');
  await expect(page.locator('.event-list li')).toHaveCount(3);
  await expect(page.locator('.gesture-court .spatial-v2-marker')).toHaveCount(2);
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
});

for (const sport of ['Futebol', 'Futsal']) {
  test(`${sport}: dimensões, finalização, feedback e histórico`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.getByRole('button', { name: `${sport}: abrir partidas e manual` }).click();
    await page.getByRole('button', { name: 'Nova partida' }).last().click();
    await page.getByRole('button', { name: 'Adicionar atleta', exact: true }).first().click();
    await page.getByLabel('Camisa Equipe A 1', { exact: true }).fill('7');
    await page.getByLabel('Nome Equipe A 1', { exact: true }).fill('Atleta A');
    await page.getByRole('button', { name: 'Iniciar partida' }).click();
    const scout = page.getByLabel('Scout Essencial', { exact: true });
    await expect(scout).toBeVisible();
    await scout.getByLabel('Direção de ataque da Equipe A').selectOption('x120');
    await scout.getByLabel('Camisa', { exact: true }).fill('7');
    await expect(scout.locator('.essential-scout-player-status')).toContainText('Atleta A');
    await scout.getByRole('button', { name: 'F · Finalização', exact: true }).click();
    await scout.getByRole('button', { name: 'Gol', exact: true }).click();
    const court = scout.locator('.gesture-court-frame');
    const bounds = await court.boundingBox();
    if (!bounds) throw new Error('Quadra ausente');
    await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .5);
    await expect(scout.locator('.gesture-court-hint')).toContainText('Terço ofensivo');
    await page.mouse.click(bounds.x + bounds.width * .8, bounds.y + bounds.height * .5);
    await expect(scout.locator('.court-receipt')).toContainText('Finalização');
    await expect(scout.locator('.court-receipt')).toContainText('Gol');
    await scout.getByRole('navigation', { name: 'Ferramentas de registro' }).getByRole('button', { name: /Histórico/ }).click();
    await expect(scout.getByRole('region', { name: 'Histórico do Scout Essencial' })).toBeVisible();
    await scout.getByRole('button', { name: 'Quadra', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1366, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const surface = scout.locator(sport === 'Futebol' ? '.football-surface' : '.futsal-surface');
      const rect = await surface.boundingBox();
      expect(rect!.width / rect!.height).toBeCloseTo(sport === 'Futebol' ? 1.5 : 2, 1);
      await page.screenshot({ path: `output/court-redesign/${sport.toLowerCase()}-${width}.png`, fullPage: true });
    }
    await scout.getByRole('button', { name: 'Ajustes da partida', exact: true }).click();
    await expect(scout).not.toBeVisible();
    await page.getByRole('button', { name: '← Voltar à quadra', exact: true }).click();
    await expect(scout).toBeVisible();
  });
}

test('falha ao salvar mantém trajetória e permite tentar novamente', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles('e2e/fixtures/court-workbench.json');
  await page.getByRole('checkbox', { name: /Registrar ao soltar/ }).check();
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: Parameters<IDBDatabase['transaction']>) {
      const tx = original.apply(this, args);
      const stores = typeof args[0] === 'string' ? [args[0]] : Array.from(args[0]);
      if (args[1] === 'readwrite' && stores.includes('events')) {
        IDBDatabase.prototype.transaction = original;
        tx.abort();
      }
      return tx;
    };
  });
  const surface = page.locator('.gesture-court .spatial-v2-surface');
  const rect = await surface.boundingBox();
  if (!rect) throw new Error('Quadra ausente');
  await page.mouse.move(rect.x + rect.width * .2, rect.y + rect.height * .3);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .8, rect.y + rect.height * .7, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('alert')).toContainText('Rascunho mantido');
  await expect(surface.locator('.spatial-v2-marker')).toHaveCount(2);
  await expect(page.locator('.event-list li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
});
