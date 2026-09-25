import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t09-registrations-reuse';

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T09 registers a football athlete without a permanent shirt and requires a match shirt before reuse', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Equipes e atletas' }).click();
  await page.getByRole('button', { name: 'Atletas', exact: true }).click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByLabel('Nome do atleta 1').fill("Ana D'Ávila-Souza");
  await page.getByRole('button', { name: 'Salvar e adicionar próximo' }).click();
  await expect(page.getByText('1 atleta(s) salvo(s). Pronto para adicionar o próximo.')).toBeVisible();
  await expect(page.getByText("Ana D'Ávila-Souza · Futebol · Não informada · Ativo")).toBeVisible();

  await page.getByRole('button', { name: 'Equipes', exact: true }).click();
  await page.getByLabel('Nome da equipe').fill('Treino FC');
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByLabel(/Ana D'Ávila-Souza · Futebol/).check();
  await page.getByRole('button', { name: 'Salvar equipe' }).click();
  await expect(page.getByText('Treino FC')).toBeVisible();

  await page.getByRole('button', { name: 'Partidas' }).click();
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.locator('#saved-team-A').selectOption({ label: 'Treino FC' });
  await expect(page.getByLabel('Nome Equipe A 1')).toHaveValue("Ana D'Ávila-Souza");
  await expect(page.getByLabel('Camisa Equipe A 1')).toHaveValue('');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByText('Informe a camisa para inscrever este atleta na partida.')).toBeVisible();

  await page.getByLabel('Camisa Equipe A 1').fill('12');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await page.screenshot({ path: `${output}/football-reuse-1366x768.png`, fullPage: true });

  await page.getByRole('button', { name: '← Partidas' }).click();
  await page.getByRole('button', { name: 'Nova partida' }).click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.locator('#saved-team-A').selectOption({ label: 'Treino FC' });
  await expect(page.getByLabel('Camisa Equipe A 1')).toHaveValue('');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/reuse-390x844.png`, fullPage: true });
});
