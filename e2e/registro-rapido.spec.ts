/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import type { MatchExport } from '../src/infrastructure/export/json/MatchJson';

async function failNextEventWrite(page: Page) {
  await page.evaluate(() => {
    // Preserve the prototype method; invoke it below with the original database receiver.
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
}

async function drag(page: Page) {
  const surface = page.locator('.gesture-court .spatial-v2-surface');
  await surface.scrollIntoViewIfNeeded();
  const rect = await surface.boundingBox();
  if (!rect) throw new Error('Quadra ausente');
  await page.mouse.move(rect.x + 0.2 * rect.width, rect.y + 0.3 * rect.height);
  await page.mouse.down();
  await page.mouse.move(rect.x + 0.8 * rect.width, rect.y + 0.7 * rect.height, { steps: 5 });
  await page.mouse.up();
}

test('registro rápido mantém trajetória/ausência e permite corrigir o contexto com replay', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 640 });
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles('output/u7/partida-antes.json');
  await expect(page.locator('.match-workspace-nav')).toBeVisible();
  await page.locator('.app-message button').click();
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  await expect(page.locator('.capture-heading')).toContainText('Saque');
  const picker = page.getByRole('group', { name: 'Selecionar atleta' });
  await expect(picker.locator('[data-position="1"] .gesture-player-name')).toHaveText(
    'Beatriz Lima',
  );
  await fs.mkdir('output/registro-rapido', { recursive: true });
  await page.screenshot({ path: 'output/registro-rapido/desktop.png' });
  const commit = await page
    .getByRole('button', { name: 'Registrar · Enter', exact: true })
    .boundingBox();
  expect(commit && commit.y + commit.height).toBeLessThanOrEqual(640);
  await page.getByRole('checkbox', { name: /Registrar ao soltar/ }).check();
  await picker.getByRole('button', { name: 'Sem atleta identificado', exact: true }).click();
  await drag(page);
  await expect(page.locator('.event-list li')).toHaveCount(4);
  await expect(page.locator('.capture-heading')).toContainText('Recepção');
  await page.getByRole('button', { name: 'Bola de graça', exact: true }).click();
  await expect(page.locator('.capture-heading')).toContainText('Bola de graça');
  await expect(page.locator('.capture-heading')).toContainText('Lagoa AC');
  await drag(page);
  await expect(page.locator('.event-list li')).toHaveCount(5);
  await expect(page.locator('.capture-heading')).toContainText('Defesa');
  await expect(page.locator('.capture-heading')).toContainText('Serra Vôlei');
  await picker.locator('[data-position="1"]').click();
  await drag(page);
  await expect(page.locator('.capture-heading')).toContainText('Ataque');
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await page.locator('.summary-export-menu summary').click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click();
  const download = await downloading;
  await download.saveAs('output/registro-rapido/acoes.json');
  const backup = JSON.parse(
    await fs.readFile('output/registro-rapido/acoes.json', 'utf8'),
  ) as MatchExport;
  const events = backup.events.filter((event) => event.type === 'scout_registered');
  expect(events).toHaveLength(6);
  expect(events[3].event.playerId).toBeUndefined();
  expect(events[4].event.skill).toBe('free_ball');
  expect(events[4].event.teamId).toBe(backup.teams[1].id);
  expect(events[4].event.metadata?.spatial?.origin?.x).toBeCloseTo(0.2, 2);
  expect(events[4].event.metadata?.spatial?.destination?.y).toBeCloseTo(0.7, 2);
  expect(events[5].event.skill).toBe('dig');
  expect(events[5].event.teamId).toBe(backup.teams[0].id);
  expect(backup.events.some((event) => event.type === 'scout_corrected')).toBe(false);
  await page.getByRole('button', { name: 'Registro', exact: true }).click();
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  await page.getByRole('button', { name: 'Ajustar rotação, saque e placar', exact: true }).click();
  const form = page.getByRole('form', { name: 'Ajuste rápido da partida' });
  await form
    .getByRole('combobox', { name: 'Equipe sacadora', exact: true })
    .selectOption(backup.teams[1].id);
  await form.getByRole('spinbutton', { name: 'Placar · Serra Vôlei', exact: true }).fill('12');
  await form.getByRole('spinbutton', { name: 'Placar · Lagoa AC', exact: true }).fill('9');
  await form
    .getByRole('combobox', { name: 'P1 / sacador · Serra Vôlei', exact: true })
    .selectOption(backup.players.find((p) => p.number === 3)!.id);
  await form
    .getByRole('combobox', { name: 'P1 / sacador · Lagoa AC', exact: true })
    .selectOption(backup.players.find((p) => p.number === 9)!.id);
  await form.getByRole('checkbox', { name: /Retomar pelo saque/ }).check();
  await failNextEventWrite(page);
  await form.getByRole('button', { name: 'Aplicar ajustes', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Suas escolhas foram mantidas');
  await expect(form.getByRole('spinbutton', { name: 'Placar · Serra Vôlei', exact: true })).toHaveValue('12');
  await form.getByRole('spinbutton', { name: 'Placar · Lagoa AC', exact: true }).press('Enter');
  await expect(form).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ajustar rotação, saque e placar', exact: true })).toBeFocused();
  await expect(page.locator('.capture-heading')).toContainText('Saque');
  await expect(page.locator('.serving-inline')).toContainText('#09');
  await expect(page.locator('.match-workspace-score')).toContainText('12');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro', exact: true }).click();
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  await expect(page.locator('.serving-inline')).toContainText('#09');
  await expect(page.locator('.capture-heading')).toContainText('Saque');
  await expect(picker.locator('[data-position="1"]')).toContainText('#09');
  for (const width of [1024, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: 'output/registro-rapido/celular.png' });
});

test('falha no registro rápido mantém atleta e trajetória para nova confirmação', async ({ page }) => {
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles('output/u7/partida-antes.json');
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  await page.getByRole('checkbox', { name: /Registrar ao soltar/ }).check();
  await page.getByRole('button', { name: 'Sem atleta identificado', exact: true }).click();
  await failNextEventWrite(page);
  await drag(page);
  await expect(page.getByRole('alert')).toContainText('Rascunho mantido');
  await expect(page.locator('.event-list li')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Sem atleta identificado', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gesture-court .spatial-v2-marker')).toHaveCount(2);
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
  await expect(page.locator('.capture-heading')).toContainText('Recepção');
});
