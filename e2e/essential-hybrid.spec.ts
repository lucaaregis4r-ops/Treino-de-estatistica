import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type Sport = 'football' | 'futsal';
type EssentialCode = 'F' | 'PF' | 'PP' | 'RP';

async function openHome(page: Page) {
  await page.goto('/');
  const sportPicker = page.getByRole('heading', { name: 'Escolha a modalidade' });
  try {
    await sportPicker.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    // A transient module-load failure can leave the initial root empty. Retry once.
    await page.reload();
    await sportPicker.waitFor({ state: 'visible', timeout: 8_000 });
  }
}

async function createMatch(page: Page, sport: Sport) {
  await openHome(page);
  await page.getByRole('button', { name: `${sport === 'football' ? 'Futebol' : 'Futsal'}: abrir partidas e manual` }).click();
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByRole('button', { name: 'Adicionar atleta', exact: true }).first().click();
  await page.getByLabel('Camisa Equipe A 1', { exact: true }).fill('7');
  await page.getByLabel('Nome Equipe A 1', { exact: true }).fill('Atleta A');
  await page.getByRole('button', { name: 'Adicionar atleta', exact: true }).last().click();
  await page.getByLabel('Camisa Equipe B 1', { exact: true }).fill('9');
  await page.getByLabel('Nome Equipe B 1', { exact: true }).fill('Atleta B');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByLabel('Scout Essencial', { exact: true })).toBeVisible();
}

async function resumeMatch(page: Page, sport: Sport) {
  await openHome(page);
  await page.getByRole('button', { name: `${sport === 'football' ? 'Futebol' : 'Futsal'}: abrir partidas e manual` }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).first().click();
  await expect(page.getByLabel('Scout Essencial', { exact: true })).toBeVisible();
}

async function enterCode(page: Page, code: EssentialCode) {
  const input = page.getByLabel('Scout Essencial', { exact: true }).getByLabel('Código', { exact: true });
  await input.fill(code);
  await input.press('Enter');
}

async function pressShortcut(page: Page, code: EssentialCode) {
  await page.getByRole('button', { name: 'Registro', exact: true }).focus();
  for (const key of code.toLowerCase()) await page.keyboard.press(key);
  const labels: Record<EssentialCode, string> = {
    F: 'F · Finalização',
    PF: 'PF · Passe para finalização',
    PP: 'PP · Perda de posse',
    RP: 'RP · Recuperação de posse',
  };
  await expect(page.getByLabel('Scout Essencial', { exact: true }).getByRole('button', { name: labels[code] })).toHaveAttribute('aria-pressed', 'true');
}

async function clickCourt(page: Page, x: number, y: number) {
  const court = page.getByLabel('Scout Essencial', { exact: true }).getByRole('application');
  const box = await court.boundingBox();
  if (!box) throw new Error('Campo ou quadra do Scout Essencial ausente');
  await court.click({ position: { x: box.width * x, y: box.height * y } });
}

function history(page: Page) {
  return page.getByLabel('Histórico do Scout Essencial');
}

for (const sport of ['football', 'futsal'] as const) {
  test(`Registro único: ${sport} salva passe, progressão, falta e reinício qualificados`, async ({ page }) => {
    test.setTimeout(120_000);
    await createMatch(page, sport);
    const scout = page.getByLabel('Scout Essencial', { exact: true });
    const code = scout.getByLabel('Código', { exact: true });
    await scout.getByLabel('Direção de ataque da Equipe A').selectOption('x120');

    await code.fill('7PSR3');
    await code.press('Enter');
    await expect(history(page).getByText('P · Passe', { exact: true })).toBeVisible();
    await expect(history(page)).toContainText('Passe certo');
    await expect(history(page)).toContainText('Ruptura');

    await code.fill('7CCMT2');
    await code.press('Enter');
    await expect(history(page)).toContainText('C · Progressão');
    await expect(history(page)).toContainText('Condução');
    await expect(history(page)).toContainText('Manteve a posse');

    await code.fill(sport === 'futsal' ? '7FLAY3' : '7FLY3');
    await code.press('Enter');
    await expect(history(page)).toContainText('FL · Falta');
    await expect(history(page)).toContainText('Cartão amarelo');
    if (sport === 'futsal') await expect(history(page)).toContainText('Acumulada: sim');

    await code.fill('7REL3');
    await code.press('Enter');
    await expect(history(page)).toContainText('RE · Reinício');
    await expect(history(page)).toContainText('Lateral');
    await expect(history(page).locator('li')).toHaveCount(4);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(scout.getByRole('application')).toBeVisible();
    await expect(scout.getByRole('button', { name: 'C · Progressão' })).toBeVisible();
  });

  test(`Scout Essencial: ${sport} records, corrects, deletes and restores its four codes`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 900 });
    await createMatch(page, sport);

    const scout = page.getByLabel('Scout Essencial', { exact: true });
    const team = scout.getByLabel('Equipe', { exact: true });
    const shirt = scout.getByLabel('Camisa', { exact: true });

    await page.getByRole('button', { name: 'Registro', exact: true }).focus();
    await page.keyboard.press('2');
    await expect(team).toHaveValue((await team.locator('option').nth(1).getAttribute('value'))!);
    await page.keyboard.press('1');
    await expect(team).toHaveValue((await team.locator('option').first().getAttribute('value'))!);
    await page.keyboard.press('t');
    await expect(scout.getByRole('button', { name: 'Pausar tempo (T)' })).toBeVisible();
    await page.keyboard.press('t');
    await expect(scout.getByRole('button', { name: 'Iniciar tempo (T)' })).toBeVisible();
    await page.keyboard.press('j');
    await expect(shirt).toBeFocused();
    await shirt.fill('7');
    await shirt.press('Enter');
    await expect(shirt).not.toBeFocused();
    await enterCode(page, 'F');
    await clickCourt(page, .3, .4);
    await scout.getByRole('button', { name: 'Gol', exact: true }).click();
    await expect(history(page).locator('li').filter({ hasText: /\bF\b/ })).toHaveCount(1);
    await expect(history(page).locator('li').filter({ hasText: /\bF\b/ })).toContainText('Equipe A · #7');
    await expect(page.getByLabel('Placar do Scout Essencial')).toContainText(/Equipe A\D*1/);

    await pressShortcut(page, 'PF');
    await clickCourt(page, .25, .45);
    await clickCourt(page, .55, .45);
    await expect(history(page).locator('li').filter({ hasText: /\bPF\b/ })).toHaveCount(1);
    await expect(history(page).locator('li').filter({ hasText: /\bPF\b/ })).toContainText('→');

    await team.selectOption({ index: 1 });
    await shirt.fill('9');
    await pressShortcut(page, 'PP');
    await scout.getByRole('button', { name: 'Salvar sem localização' }).click();
    await expect(history(page).locator('li').filter({ hasText: /\bPP\b/ })).toHaveCount(1);
    await expect(history(page).locator('li').filter({ hasText: /\bPP\b/ })).toContainText('Equipe B · #9');
    await expect(history(page).locator('li').filter({ hasText: /\bPP\b/ })).toContainText('sem localização');

    await team.selectOption({ index: 0 });
    await shirt.fill('7');
    await pressShortcut(page, 'RP');
    await clickCourt(page, .7, .6);
    await expect(history(page).locator('li').filter({ hasText: /\bRP\b/ })).toHaveCount(1);
    await expect(history(page).locator('li strong')).toHaveText([
      'F · Finalização', 'PF · Passe para finalização', 'PP · Perda de posse', 'RP · Recuperação de posse',
    ]);

    await page.keyboard.press('z');
    await expect(history(page).locator('li').filter({ hasText: /\bRP\b/ })).toHaveCount(0);
    await enterCode(page, 'RP');
    await clickCourt(page, .7, .6);
    await expect(history(page).locator('li').filter({ hasText: /\bRP\b/ })).toHaveCount(1);

    const shot = history(page).locator('li').filter({ hasText: /\bF\b/ });
    const shotId = await shot.getAttribute('data-fact-id');
    expect(shotId).toBeTruthy();
    await shot.getByRole('button', { name: 'Editar' }).click();
    await scout.getByRole('button', { name: 'Defesa', exact: true }).click();
    await scout.getByRole('button', { name: 'Salvar correção' }).click();
    await expect(shot).toContainText('Defesa');
    await expect(shot).toHaveAttribute('data-fact-id', shotId!);
    await expect(page.getByLabel('Placar do Scout Essencial')).toContainText(/Equipe A\D*0/);
    await shot.getByRole('button', { name: 'Excluir' }).click();
    await expect(history(page).locator('li').filter({ hasText: /\bF\b/ })).toHaveCount(0);

    await page.reload();
    await resumeMatch(page, sport);
    await expect(history(page).locator('li').filter({ hasText: /\bPF\b/ })).toHaveCount(1);
    await expect(history(page).locator('li').filter({ hasText: /\bPP\b/ })).toHaveCount(1);
    await expect(history(page).locator('li').filter({ hasText: /\bRP\b/ })).toHaveCount(1);
    await expect(history(page).locator('li').filter({ hasText: /\bF\b/ })).toHaveCount(0);
    await expect(history(page).locator('li strong')).toHaveText([
      'PF · Passe para finalização', 'PP · Perda de posse', 'RP · Recuperação de posse',
    ]);

    await page.getByText('Mais', { exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON' }).click();
    const backupPath = await (await download).path();
    if (!backupPath) throw new Error('Backup JSON não foi disponibilizado pelo navegador');
    const backup = JSON.parse(await readFile(backupPath, 'utf8')) as { match: { sport: string }; events: unknown[] };
    expect(backup.match.sport).toBe(sport);
    expect(backup.events.length).toBeGreaterThan(0);
    const serializedEvents = JSON.stringify(backup.events);
    for (const code of ['F', 'PF', 'PP', 'RP']) expect(serializedEvents).toContain(`"${code}"`);

    await page.setViewportSize({ width: 390, height: 844 });
    await pressShortcut(page, 'F');
    await expect(scout.getByRole('button', { name: 'Gol', exact: true })).toBeInViewport();
    await expect(scout.getByRole('application')).toBeInViewport({ ratio: 0.5 });
  });
}

for (const sport of ['football', 'futsal'] as const) {
  test(`Scout Essencial: ${sport} accepts compact qualified thirds and an unregistered shirt`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 900 });
    await createMatch(page, sport);
    const scout = page.getByLabel('Scout Essencial', { exact: true });
    await scout.getByLabel('Direção de ataque da Equipe A').selectOption('x120');
    const code = scout.getByLabel('Código', { exact: true });

    await code.fill('77FG3');
    await code.press('Enter');
    const shot = history(page).locator('li').filter({ hasText: /F · Finalização/ });
    await expect(shot).toHaveCount(1);
    await expect(shot).toContainText('#77');
    await expect(shot).toContainText('Gol');
    await expect(shot).toContainText(/ofensivo/i);
    await expect(page.getByLabel('Placar do Scout Essencial')).toContainText(/Equipe A\D*1/);

    await code.fill('77PFCT3');
    await code.press('Enter');
    const pass = history(page).locator('li').filter({ hasText: /PF · Passe para finalização/ });
    await expect(pass).toContainText(/cruzamento/i);
    await expect(pass).toContainText(/transição/i);
    await expect(pass).toContainText(/ofensivo/i);

    await code.fill('77PPD1');
    await code.press('Enter');
    const loss = history(page).locator('li').filter({ hasText: /PP · Perda de posse/ });
    await expect(loss).toContainText(/desarmado/i);
    await expect(loss).toContainText(/defensivo/i);

    await page.getByText('Mais', { exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON' }).click();
    const backupPath = await (await download).path();
    if (!backupPath) throw new Error('Backup JSON não foi disponibilizado pelo navegador');
    const backup = JSON.parse(await readFile(backupPath, 'utf8')) as { events: Array<{ event?: Record<string, unknown>; fact?: Record<string, unknown> }> };
    const shirtKey = sport === 'football' ? 'essential_shirt_number' : 'essentialShirtNumber';
    const shotEvent = backup.events.find(item => JSON.stringify(item).includes(`"${shirtKey}":77`) && JSON.stringify(item).includes('"F"'));
    expect(shotEvent).toBeDefined();
    expect(sport === 'football' ? shotEvent?.event?.location : shotEvent?.fact?.position).toBeUndefined();
    expect(JSON.stringify(backup.events)).toContain('"cross"');
    expect(JSON.stringify(backup.events)).toContain('"tackled"');

    await page.reload();
    await resumeMatch(page, sport);
    await expect(history(page).locator('li')).toHaveCount(3);
    await expect(history(page)).toContainText('#77');
  });

  test(`Scout Essencial: ${sport} interprets one exact point by each team's attack direction`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 900 });
    await createMatch(page, sport);
    const scout = page.getByLabel('Scout Essencial', { exact: true });
    await scout.getByLabel('Direção de ataque da Equipe A').selectOption('x120');
    const team = scout.getByLabel('Equipe', { exact: true });

    await team.selectOption({ index: 1 });
    await enterCode(page, 'RP');
    await clickCourt(page, .2, .5);
    const recoveries = history(page).locator('li').filter({ hasText: /RP · Recuperação de posse/ });
    await expect(recoveries).toHaveCount(1);
    await expect(recoveries.first()).toContainText(/ofensivo/i);

    await team.selectOption({ index: 0 });
    await enterCode(page, 'RP');
    await clickCourt(page, .2, .5);
    await expect(recoveries).toHaveCount(2);
    await expect(recoveries.nth(1)).toContainText(/defensivo/i);

    await enterCode(page, 'PP');
    await page.getByRole('button', { name: 'Registro', exact: true }).focus();
    await page.keyboard.press('4');
    const loss = history(page).locator('li').filter({ hasText: /PP · Perda de posse/ });
    await expect(loss).toHaveCount(1);
    await expect(loss).toContainText(/central/i);
  });

  test(`Scout Essencial: ${sport} edits PF destination third and multiple qualifiers`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1366, height: 900 });
    await createMatch(page, sport);
    const scout = page.getByLabel('Scout Essencial', { exact: true });
    await enterCode(page, 'PF');
    await scout.getByRole('group', { name: 'Pontos da ação' }).getByRole('button', { name: 'Destino' }).click();
    await scout.getByRole('button', { name: 'Cruzamento' }).click();
    await scout.getByRole('button', { name: 'Transição' }).click();
    await scout.getByRole('button', { name: 'Terço ofensivo (5)' }).click();
    const pass = history(page).locator('li').filter({ hasText: /PF · Passe para finalização/ });
    await expect(pass).toContainText(/destino/i);
    await expect(pass).toContainText(/ofensivo/i);
    await expect(pass).toContainText(/cruzamento/i);
    await expect(pass).toContainText(/transição/i);

    await pass.getByRole('button', { name: 'Editar' }).click();
    await scout.getByRole('button', { name: 'Cruzamento' }).click();
    await scout.getByRole('button', { name: 'Terço defensivo (3)' }).click();
    await scout.getByRole('button', { name: 'Salvar correção' }).click();
    await expect(pass).toContainText(/defensivo/i);
    await expect(pass).toContainText(/transição/i);
    await expect(pass).not.toContainText(/cruzamento/i);

    await page.getByText('Mais', { exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON' }).click();
    const backupPath = await (await download).path();
    if (!backupPath) throw new Error('Backup JSON não foi disponibilizado pelo navegador');
    const serialized = await readFile(backupPath, 'utf8');
    expect(serialized).toContain(sport === 'football' ? 'essential_third_anchor' : 'essentialThirdAnchor');
    expect(serialized).toContain('destination');
  });
}
