/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { MatchExport } from '../src/infrastructure/export/json/MatchJson';

const phase = process.env.U7_PHASE === 'before' ? 'before' : 'after';
const artifacts = path.resolve('output/u7');
const fixture = path.join(artifacts, 'partida-antes.json');
const sizes = [
  { width: 1366, height: 640 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({ path: path.join(artifacts, `${phase}-${name}.png`) });
}

async function openFixture(page: Page) {
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles(fixture);
  await expect(page.getByText('Backup restaurado e validado com sucesso.')).toBeVisible();
  if (!(await page.locator('.match-workspace-nav').count())) {
    await page
      .getByRole('button', { name: /Serra Vôlei x Lagoa AC/ })
      .first()
      .click();
  }
  await page.locator('.app-message button').click();
}

async function exportFile(page: Page, format: 'JSON' | 'PDF') {
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  const menu = page.locator('.summary-export-menu');
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open)))
    await menu.locator('summary').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Exportar ${format}`, exact: true }).click();
  const file = await download;
  if (format === 'PDF') await file.saveAs(path.join(artifacts, 'relatorio-verificado.pdf'));
  const filePath = await file.path();
  if (!filePath) throw new Error('Download indisponível');
  return fs.readFile(filePath, 'utf8');
}

async function drag(page: Page) {
  const court = page.locator('.gesture-court .spatial-v2-surface');
  await court.scrollIntoViewIfNeeded();
  const box = await court.boundingBox();
  if (!box) throw new Error('Quadra ausente');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 5 });
  await page.mouse.up();
}

test('U7: comparação com os mesmos dados e viewports', async ({ page }) => {
  test.setTimeout(90_000);
  await fs.mkdir(artifacts, { recursive: true });
  await page.setViewportSize(sizes[0]);
  if (phase === 'before') {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nova partida', exact: true }).click();
    await page.locator('#team-a-name').fill('Serra Vôlei');
    await page.locator('#team-b-name').fill('Lagoa AC');
    await page
      .locator('#team-a-players')
      .fill(
        '1 Ana Souza, 2 Beatriz Lima, 3 Carla Santos, 4 Diana Reis, 5 Elisa Silva, 6 Fernanda Costa, 13 Gabriela Líbero | libero, 14 Helena Reserva',
      );
    await page
      .locator('#team-b-players')
      .fill(
        '7 Igor Souza, 8 João Lima, 9 Kaique Santos, 10 Lucas Reis, 11 Marcos Silva, 12 Nicolas Costa, 15 Oscar Líbero | libero, 16 Paulo Reserva',
      );
    await page.getByLabel('A líbero', { exact: true }).selectOption('13');
    await page.getByLabel('B líbero', { exact: true }).selectOption('15');
    await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
    const input = page.getByLabel('Digite o código');
    await input.fill('*01S#a07A#*04A#');
    await input.press('Enter');
    await expect(page.locator('.event-list li')).toHaveCount(3);
    await page.getByRole('button', { name: 'Resumo', exact: true }).click();
    await page.locator('.summary-export-menu summary').click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click();
    await (await download).saveAs(fixture);
    await page.locator('.app-message button').click();
  } else await openFixture(page);

  await page.getByRole('button', { name: '← Partidas', exact: true }).click();
  await capture(page, 'partidas-1366x640');
  await page.getByRole('button', { name: 'Início', exact: true }).click();
  await capture(page, 'inicio-1366x640');
  await page.getByRole('button', { name: 'Continuar registro', exact: true }).click();
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await capture(page, `gestual-${size.width}x${size.height}`);
    if (phase === 'after') {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (size.width === 1366) {
        const commit = await page
          .getByRole('button', { name: 'Registrar · Enter', exact: true })
          .boundingBox();
        expect(commit && commit.y + commit.height).toBeLessThanOrEqual(size.height);
      }
    }
  }
  await page.setViewportSize(sizes[0]);
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await capture(page, 'analise-1366x640');
});

test('U7: backup anterior, rotação, líbero, teclado, análises e relatório persistem', async ({
  page,
}) => {
  test.skip(phase === 'before');
  test.setTimeout(90_000);
  await page.setViewportSize(sizes[0]);
  await openFixture(page);
  const before = JSON.parse(await fs.readFile(fixture, 'utf8')) as MatchExport;
  const reopened = JSON.parse(await exportFile(page, 'JSON')) as MatchExport;
  expect(reopened.match).toEqual(before.match);
  expect(reopened.players).toEqual(before.players);
  expect(reopened.events).toEqual(before.events);
  await page.getByRole('button', { name: 'Registro', exact: true }).click();
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  const picker = page.getByRole('group', { name: 'Selecionar atleta' });
  await expect(picker.locator('[data-position="1"]')).toContainText('#02');
  const details = page.locator('.match-context-details');
  await details.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open');
  await page.keyboard.press('Escape');
  await expect(details).not.toHaveAttribute('open');
  await expect(details.locator(':scope > summary')).toBeFocused();
  const recovery = page.locator('.recovery-tools');
  await recovery.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(recovery).toHaveAttribute('open');
  await page.keyboard.press('Tab');
  await expect(recovery.getByRole('button', { name: 'Saque', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(recovery.locator('summary')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(recovery).not.toHaveAttribute('open');
  await expect(page.locator('.event-list li')).toHaveCount(3);
  await drag(page);
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
  await expect(page.locator('.capture-heading')).toContainText('Recepção');
  const libero = picker.getByRole('button', { name: /Líbero · #15 Oscar/ });
  await libero.click();
  await expect(libero).toHaveAttribute('aria-pressed', 'true');
  await drag(page);
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(5);
  const registered = JSON.parse(await exportFile(page, 'JSON')) as MatchExport;
  const scouts = registered.events.filter((event) => event.type === 'scout_registered');
  expect(scouts).toHaveLength(5);
  const last = scouts.at(-1);
  if (last?.type !== 'scout_registered') throw new Error('Registro ausente');
  expect(last.event.playerId).toBe(before.players.find((player) => player.number === 15)?.id);
  expect(last.event.skill).toBe('reception');
  expect(last.event.metadata?.spatial?.origin?.x).toBeCloseTo(0.2, 2);
  expect(last.event.metadata?.spatial?.destination?.y).toBeCloseTo(0.7, 2);

  await page.getByRole('button', { name: 'Análise', exact: true }).first().click();
  await page.getByRole('combobox', { name: 'Ação', exact: true }).selectOption('serve');
  await page.getByRole('radio', { name: 'Destino', exact: true }).check();
  await page.getByRole('button', { name: 'Mapa de calor', exact: true }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Saques U7');
  await page.getByRole('button', { name: 'Salvar análise', exact: true }).click();
  await expect(page.locator('.app-message')).toContainText('Análise "Saques U7" salva.');
  await page.getByRole('tab', { name: 'Desempenho', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Incluir no relatório' }).first().check();
  await expect(page.locator('.report-chart-count')).toContainText('1 gráfico selecionado');
  await page.getByRole('tab', { name: 'Quadra', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Ação', exact: true })).toHaveValue('serve');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro', exact: true }).click();
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Análise salva', exact: true })
    .selectOption({ label: 'Saques U7' });
  await expect(page.getByRole('combobox', { name: 'Ação', exact: true })).toHaveValue('serve');
  const stored = JSON.parse(await exportFile(page, 'JSON')) as MatchExport;
  expect(stored.analysisConfigurations?.[0]?.name).toBe('Saques U7');
  expect(stored.reportChartConfigurations?.length).toBeGreaterThan(0);
  const pdf = await exportFile(page, 'PDF');
  expect(pdf).toMatch(/^%PDF-/);
});

test('U7: Visual e Híbrido preservam atleta ausente, trajetória e código', async ({ page }) => {
  test.skip(phase === 'before');
  test.setTimeout(90_000);
  await openFixture(page);
  await page.getByRole('button', { name: 'Visual', exact: true }).click();
  const visual = page.locator('.volley-visual');
  await visual.getByRole('button', { name: 'Saque', exact: true }).click();
  await visual.getByRole('button', { name: /Qualidade #/ }).click();
  await visual.getByRole('button', { name: 'Sem atleta identificado', exact: true }).click();
  const court = page.getByRole('button', { name: 'Quadra espacial clicável', exact: true });
  await court.scrollIntoViewIfNeeded();
  const box = await court.boundingBox();
  if (!box) throw new Error('Quadra ausente');
  // Playwright positions start inside the border; the mapper measures the full rect.
  const border = await court.evaluate((element) => ({
    x: parseFloat(getComputedStyle(element).borderLeftWidth),
    y: parseFloat(getComputedStyle(element).borderTopWidth),
  }));
  await court.click({
    position: { x: box.width * 0.05 - border.x, y: box.height * 0.95 - border.y },
  });
  await expect(page.getByText('Marque o destino', { exact: true })).toBeVisible();
  await court.click({
    position: { x: box.width * 0.95 - border.x, y: box.height * 0.05 - border.y },
  });
  await expect(page.getByText('Trajetória registrada', { exact: true })).toBeVisible();
  await page.setViewportSize(sizes[3]);
  await expect(
    visual.getByRole('button', { name: 'Sem atleta identificado', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await visual.getByRole('button', { name: /Registrar ação/ }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
  await page.setViewportSize(sizes[0]);
  await page.getByRole('button', { name: 'Híbrido', exact: true }).click();
  const hybrid = page.locator('.visual-scout-form');
  await hybrid.getByLabel('Código digitado', { exact: true }).fill('*02A+');
  await hybrid.getByRole('combobox', { name: 'Atleta', exact: true }).selectOption('2');
  await hybrid.getByRole('combobox', { name: 'Fundamento', exact: true }).selectOption('attack');
  await hybrid.getByRole('combobox', { name: 'Avaliação', exact: true }).selectOption('positive');
  await hybrid.getByRole('button', { name: 'Confirmar um evento', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(5);
  const backup = JSON.parse(await exportFile(page, 'JSON')) as MatchExport;
  const scouts = backup.events.filter((event) => event.type === 'scout_registered');
  const visualEvent = scouts.at(-2);
  const hybridEvent = scouts.at(-1);
  if (visualEvent?.type !== 'scout_registered' || hybridEvent?.type !== 'scout_registered')
    throw new Error('Registros ausentes');
  expect(visualEvent.event.playerId).toBeUndefined();
  expect(visualEvent.event.metadata?.spatial?.origin?.x).toBeCloseTo(0.05, 2);
  expect(visualEvent.event.metadata?.spatial?.destination?.y).toBeCloseTo(0.05, 2);
  expect(hybridEvent.event.inputMode).toBe('hybrid');
  expect(hybridEvent.event.normalizedCode).toBe('*02A+');
});

test('U7: toque cancela gesto incompleto e mantém rolagem fora da quadra', async ({
  page,
  context,
}) => {
  test.skip(phase === 'before');
  await page.setViewportSize(sizes[3]);
  await openFixture(page);
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  const frame = page.locator('.gesture-court-frame');
  await frame.scrollIntoViewIfNeeded();
  const box = await frame.boundingBox();
  if (!box) throw new Error('Quadra ausente');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + 40, y: box.y + 40 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: box.x + 90, y: box.y + 90 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(frame.locator('.spatial-v2-marker')).toHaveCount(0);
  await expect(page.locator('.event-list li')).toHaveCount(3);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + 40, y: box.y + 40 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: box.x + 180, y: box.y + 90 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
  await expect(page.locator('.event-list li')).toHaveCount(4);
  expect(await frame.evaluate((element) => getComputedStyle(element).touchAction)).toBe('none');
  expect(
    await page
      .locator('.scout-screen')
      .evaluate((element) => getComputedStyle(element).touchAction),
  ).toBe('auto');
});

test('U7: nomes longos, reservas e reflow equivalente a zoom de 200%', async ({ page }) => {
  test.skip(phase === 'before');
  test.setTimeout(60_000);
  const backup = JSON.parse(await fs.readFile(fixture, 'utf8')) as MatchExport;
  const longName = 'Associação de Voleibol da Serra e Região Metropolitana';
  const expanded = {
    ...backup,
    match: { ...backup.match, name: `${longName} x Lagoa` },
    teams: backup.teams.map((team) => ({ ...team, name: `${longName} ${team.name}` })),
    players: [
      ...backup.players.map((player) => ({
        ...player,
        name: `${player.name} de Albuquerque e Silva`,
      })),
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `u7-reserva-${index}`,
        teamId: backup.teams[0].id,
        number: 30 + index,
        name: `Reserva ${index} de Albuquerque e Silva`,
        active: true,
      })),
    ],
  };
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles({
    name: 'elenco-extenso.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(expanded)),
  });
  await expect(page.locator('.match-workspace-nav')).toBeVisible();
  await page.getByRole('button', { name: 'Gestual', exact: true }).click();
  for (const size of [...sizes, { width: 683, height: 320 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .getByRole('button', { name: 'Registrar · Enter', exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('button', { name: 'Registrar · Enter', exact: true }),
    ).toBeInViewport();
  }
  await page.locator('.gesture-reserves summary').click();
  await page
    .getByRole('button', { name: 'Reserva 19 de Albuquerque e Silva', exact: false })
    .click();
  await expect(page.locator('.gesture-selected-name')).toContainText('Reserva 19');
  await page.getByRole('button', { name: 'Sem atleta identificado', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sem atleta identificado', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await capture(page, 'zoom-equivalente-683x320');
});
