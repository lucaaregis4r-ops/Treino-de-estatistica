import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const artifacts = path.resolve('output/recovery-stage4');

test('football exports identify backup and StatsBomb subset contracts', async ({ page }) => {
  fs.mkdirSync(artifacts, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('football');
  await page.getByLabel('Nome da equipe').first().fill('Azul FC');
  await page.getByLabel('Nome da equipe').last().fill('Verde FC');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();
  await page.getByRole('button', { name: 'Recuperação' }).click();
  await page.getByRole('button', { name: 'Observada' }).click();
  const field = page.getByRole('application', { name: 'Campo: clique origem e destino ou arraste' });
  const bounds = await field.boundingBox(); if (!bounds) throw new Error('Campo indisponível');
  await field.click({ position: { x: bounds.width * .25, y: bounds.height * .3 } });
  await page.getByRole('button', { name: 'Confirmar evento' }).click();

  const [backupDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar backup completo' }).click()]);
  const backupPath = await backupDownload.path(); if (!backupPath) throw new Error('Backup não baixado');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8')) as { schemaVersion: string; modality: string; compatibility: { footballEventContract: string }; events: unknown[] };
  expect(backup).toMatchObject({ schemaVersion: '1.1.0', modality: 'football', compatibility: { footballEventContract: 'statsbomb-open-data-4.0.0-subset' } });
  expect(backup.events).toHaveLength(1);

  const [providerDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar subconjunto StatsBomb' }).click()]);
  const providerPath = await providerDownload.path(); if (!providerPath) throw new Error('Exportação StatsBomb não baixada');
  const provider = JSON.parse(fs.readFileSync(providerPath, 'utf8')) as { openDataVersion: string; modality: string; events: Array<Record<string, unknown>>; manifest: { contract: string } };
  expect(provider).toMatchObject({ openDataVersion: '4.0.0', modality: 'football', manifest: { contract: 'StatsBomb Open Data events v4.0.0 observed subset' } });
  const location = provider.events[0].location as number[];
  expect(location[0]).toBeCloseTo(30, 0);
  expect(location[1]).toBeCloseTo(24, 0);
  expect(provider.events[0].scout_trainer).toBeUndefined();
  await page.screenshot({ path: path.join(artifacts, 'exports-1366x768.png'), fullPage: true });
});
