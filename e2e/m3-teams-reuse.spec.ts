import { expect, test } from '@playwright/test';

async function openNewMatch(page: import('@playwright/test').Page) {
  const returnToList = page.getByRole('button', { name: '← Partidas' });
  if (await returnToList.isVisible().catch(() => false)) await returnToList.click();
  const home = page.getByRole('button', { name: 'Início' });
  await expect(home).toBeVisible();
  await home.click();
  await expect(page.getByRole('heading', { name: 'Seu espaço de scout' })).toBeVisible();
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await expect(page.getByRole('heading', { name: 'Nova partida' })).toBeVisible();
}

async function returnToMatches(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '← Partidas' }).click();
  await expect(page.getByRole('heading', { name: 'Partidas' })).toBeVisible();
}

test('M3: football collective, reusable team and local shirt edits survive the intended boundaries', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  await openNewMatch(page);
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await returnToMatches(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continuar registro' }).first().click();
  await expect(page.getByRole('application')).toBeVisible();
  await returnToMatches(page);

  await openNewMatch(page);
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Adicionar atleta' }).first().click();
  await page.getByLabel('Camisa Equipe A 1').fill('10');
  await page.getByLabel('Nome Equipe A 1').fill('Ana Souza');
  await page.getByRole('button', { name: 'Salvar equipe reutilizável' }).first().click();
  await expect(page.getByText('Equipe Equipe A salva para reutilização.')).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await returnToMatches(page);

  await openNewMatch(page);
  await page.getByLabel('Modalidade').selectOption('football');
  const savedTeamA = page.locator('#saved-team-A');
  await expect(savedTeamA.locator('option').filter({ hasText: 'Equipe A' })).toHaveCount(1);
  await savedTeamA.selectOption({ label: 'Equipe A' });
  await expect(page.getByLabel('Camisa Equipe A 1')).toHaveValue('10');
  await page.getByLabel('Camisa Equipe A 1').fill('23');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await returnToMatches(page);

  await openNewMatch(page);
  await page.getByLabel('Modalidade').selectOption('football');
  await expect(savedTeamA.locator('option').filter({ hasText: 'Equipe A' })).toHaveCount(1);
  await savedTeamA.selectOption({ label: 'Equipe A' });
  await expect(page.getByLabel('Camisa Equipe A 1')).toHaveValue('10');
});

test('M3: import preview, conflict, sport switch and discard prompt remain recoverable', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await openNewMatch(page);
  await page.getByLabel('Modalidade').selectOption('football');
  const paste = page.locator('details.match-paste');
  await paste.locator('summary').click();
  await paste.locator('select').selectOption('A');
  await paste.locator('textarea').fill('8 Ana\n8 Bia');
  await paste.getByRole('button', { name: 'Importar para prévia editável' }).click();
  await expect(page.getByLabel('Nome Equipe A 2')).toHaveValue('Bia');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.locator('#new-match-error')).toContainText('Revise as linhas destacadas');

  await page.getByLabel('Camisa Equipe A 2').fill('9');
  await page.getByLabel('Posição Equipe A 1').selectOption('forward');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Modalidade').selectOption('volleyball');
  await expect(page.getByLabel('Camisa Equipe A 1')).toHaveValue('8');
  await expect(page.getByLabel('Posição Equipe A 1')).toHaveValue('');

  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Início' }).click();
  await expect(page.getByRole('heading', { name: 'Nova partida' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Início' }).click();
  await expect(page.getByRole('heading', { name: 'Seu espaço de scout' })).toBeVisible();
});

test('M3: volleyball creates a reviewed valid demonstration lineup on a narrow mobile viewport', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await openNewMatch(page);
  await page.getByRole('button', { name: 'Usar elenco demonstrativo' }).click();
  await expect(page.getByRole('group', { name: 'Escalação inicial · equipe A' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Escalação inicial · equipe B' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  await expect(page.getByRole('heading', { name: /Ação atual: Saque/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
