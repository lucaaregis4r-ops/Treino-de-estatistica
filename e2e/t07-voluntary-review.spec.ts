import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const output = 'output/t07-voluntary-review';

async function createFootballMatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
}
async function mark(page: import('@playwright/test').Page, x: number, y: number) {
  const field = page.getByRole('application'); const box = await field.boundingBox();
  if (!box) throw new Error('Campo não encontrado');
  await field.click({ position: { x: box.width * x, y: box.height * y } });
  await expect(page.getByText('Marco salvo.')).toBeVisible();
}

test.beforeEach(() => fs.mkdirSync(output, { recursive: true }));

test('T07 opens review explicitly, saves multiple local actions, and returns to live collection', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createFootballMatch(page);
  await page.getByRole('button', { name: 'Equipe A', exact: true }).click();
  await page.getByRole('button', { name: 'Sugerir trechos para completar', exact: true }).click();
  await mark(page, .58, .12); await mark(page, .88, .25);
  const review = page.getByRole('button', { name: /Revisar sugestões/ });
  await expect(review).toBeVisible();
  await review.click();
  await expect(page.getByRole('heading', { name: 'Completar trechos observados' })).toBeVisible();
  await page.getByRole('button', { name: 'Revisar trecho' }).click();
  await page.getByLabel('Passe').check();
  await page.getByLabel('Domínio/recepção').check();
  await page.getByRole('button', { name: 'Salvar descrição observada' }).click();
  await expect(page.getByText('Descrição observada salva; ela não cria uma ação de jogo.')).toBeVisible();
  await page.getByRole('button', { name: '← Lista de trechos' }).click();
  await expect(page.getByText('descrita')).toBeVisible();
  await page.screenshot({ path: `${output}/review-1366x768.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: `${output}/review-390x844.png`, fullPage: true });
  await page.getByRole('button', { name: 'Voltar ao ao vivo' }).click();
  await expect(page.getByRole('application')).toBeVisible();
});
