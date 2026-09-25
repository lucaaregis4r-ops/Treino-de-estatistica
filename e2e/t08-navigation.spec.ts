import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t08-navigation';

async function openMatchMenu(page: import('@playwright/test').Page) {
  const menu = page.locator('.match-workspace-more');
  if (!(await menu.evaluate((element) => element.hasAttribute('open')))) {
    await page.getByText('Mais', { exact: true }).click();
  }
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T08 keeps the football workspace compact while its secondary destinations return to the same match', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();

  await expect(page.getByRole('banner', { name: 'Navegação da partida' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registro' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('application')).toBeVisible();

  await openMatchMenu(page);
  await page.getByRole('button', { name: 'Revisar sugestões' }).click();
  await expect(page.getByRole('heading', { name: 'Completar trechos observados' })).toBeVisible();
  await page.screenshot({ path: `${output}/review-from-match-menu-1366x768.png`, fullPage: true });
  await page.getByRole('button', { name: 'Voltar ao ao vivo' }).click();
  await expect(page.getByRole('application')).toBeVisible();

  await openMatchMenu(page);
  await page.getByRole('button', { name: 'Equipes e atletas' }).click();
  await expect(page.getByRole('heading', { name: 'Equipes e atletas' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à partida' }).click();
  await expect(page.getByRole('application')).toBeVisible();

  await page.getByRole('button', { name: '← Partidas' }).click();
  await expect(page.getByRole('heading', { name: 'Partidas' })).toBeVisible();
  await page.getByLabel('Modalidade').selectOption('football');
  await expect(page.getByRole('button', { name: 'Equipe A x Equipe B' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await page.getByRole('button', { name: '← Partidas' }).click();
  await expect(page.getByLabel('Modalidade')).toHaveValue('football');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const globalNavigation = page.getByRole('navigation', { name: 'Navegação principal' });
  await globalNavigation.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await expect(page.getByRole('button', { name: 'Ajuda' })).toBeVisible();
  await page.screenshot({ path: `${output}/matches-390x844.png`, fullPage: true });
});
