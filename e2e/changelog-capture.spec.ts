import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const captureDir = path.resolve('output/changelog-captures');

async function shot(page: Page, name: string, locator?: ReturnType<Page['locator']>) {
  await page.waitForTimeout(250);
  await (locator ?? page).screenshot({ path: path.join(captureDir, `${name}.png`) });
}

async function registerSpatial(page: Page, action: string, quality: string, player: RegExp, origin: [number, number], destination: [number, number]) {
  await page.getByRole('button', { name: action, exact: true }).click();
  await page.getByRole('button', { name: `Qualidade ${quality}` }).click();
  await page.getByRole('button', { name: player }).click();
  const court = page.getByRole('button', { name: 'Quadra espacial clicável' });
  const box = await court.boundingBox();
  if (!box) throw new Error('Quadra espacial indisponível.');
  await page.mouse.click(box.x + box.width * origin[0], box.y + box.height * origin[1]);
  await page.mouse.click(box.x + box.width * destination[0], box.y + box.height * destination[1]);
  await page.getByRole('button', { name: /Registrar ação/ }).click();
  await page.locator('.spatial-v2-controls').getByRole('button', { name: 'Refazer' }).click();
}

test('captura visual do changelog 0.3', async ({ page }) => {
  await fs.mkdir(captureDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await shot(page, '01-inicio');
  await page.getByRole('button', { name: 'Cadastros', exact: true }).click();
  await shot(page, '02-cadastros');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('radio', { name: /Tático/ }).click();
  await shot(page, '03-nova-partida');
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  await page.getByRole('button', { name: 'Visual', exact: true }).click();
  await page.getByRole('button', { name: 'Ataque', exact: true }).click();
  await page.getByRole('button', { name: 'Qualidade #' }).click();
  await page.getByRole('button', { name: /P4 04 Jogador 4/ }).click();
  const court = page.getByRole('button', { name: 'Quadra espacial clicável' });
  const box = await court.boundingBox();
  if (!box) throw new Error('Quadra espacial indisponível.');
  await page.mouse.click(box.x + box.width * 0.22, box.y + box.height * 0.25);
  await page.mouse.click(box.x + box.width * 0.84, box.y + box.height * 0.72);
  await expect(page.getByRole('status')).toHaveText('Trajetória registrada');
  await shot(page, '04-registro-visual-quadra', page.locator('.volley-visual'));
  await page.getByRole('button', { name: /Registrar ação/ }).click();
  await page.locator('.spatial-v2-controls').getByRole('button', { name: 'Refazer' }).click();
  const samples: Array<[string, string, RegExp, [number, number], [number, number]]> = [
    ['Ataque', '+', /P3 03 Jogador 3/, [0.28, 0.72], [0.76, 0.22]],
    ['Ataque', '#', /P2 02 Jogador 2/, [0.32, 0.45], [0.88, 0.48]],
    ['Ataque', '!', /P5 05 Jogador 5/, [0.20, 0.83], [0.72, 0.78]],
    ['Saque', '#', /P1 01 Jogador 1/, [0.08, 0.50], [0.92, 0.18]],
    ['Saque', '+', /P6 06 Jogador 6/, [0.10, 0.82], [0.82, 0.62]],
    ['Defesa', '+', /P5 05 Jogador 5/, [0.18, 0.70], [0.46, 0.38]],
    ['Levantamento', '+', /P1 01 Jogador 1/, [0.36, 0.48], [0.42, 0.18]],
    ['Ataque', '-', /P4 04 Jogador 4/, [0.25, 0.20], [0.78, 0.54]],
    ['Ataque', '#', /P3 03 Jogador 3/, [0.30, 0.52], [0.90, 0.82]],
  ];
  for (const sample of samples) await registerSpatial(page, ...sample);
  await shot(page, '05-registro-e-ultimas-acoes', page.locator('main'));
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await shot(page, '06-resumo-estatistico');
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Probabilidade de vitória' })).toBeVisible();
  await shot(page, '07-probabilidade-vitoria', page.getByLabel('Probabilidade de vitória'));
  const spatialPanel = page.getByRole('heading', { name: 'Distribuição em quadra' }).locator('..').locator('..');
  await shot(page, '08-analise-espacial-pontos', spatialPanel);
  await page.getByRole('button', { name: 'Mapa de calor', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Mapa de calor' })).toBeVisible();
  await shot(page, '09-heatmap', spatialPanel);
  await page.getByRole('button', { name: 'Trajetórias', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Mapa de jogadas' })).toBeVisible();
  await shot(page, '10-jogadas', spatialPanel);
});
