import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('edits, previews, reopens and exports the match report', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  const code = page.getByLabel('Digite o código');
  await code.fill('*01A#');
  await code.press('Enter');
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await page.getByLabel('Incluir no relatório · Desempenho por rotação', { exact: true }).click();
  await expect(
    page.getByLabel('Incluir no relatório · Desempenho por rotação', { exact: true }),
  ).toBeChecked();
  await page.getByLabel('Incluir no relatório · Performance das equipes', { exact: true }).click();
  await expect(
    page.getByLabel('Incluir no relatório · Performance das equipes', { exact: true }),
  ).toBeChecked();
  await page
    .getByRole('list', { name: 'Gráficos selecionados para o relatório' })
    .locator('li')
    .nth(1)
    .getByRole('button', { name: '↑', exact: true })
    .click();
  await expect(page.getByLabel('Título do gráfico 1', { exact: true })).toHaveValue(
    'Performance das equipes',
  );
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await page.getByLabel('Título do relatório').fill('Relatório da comissão');
  await page.getByLabel('Responsável pela análise').fill('Lucas');
  await page.getByLabel('Observações da análise').fill('Priorizar saque na zona 1.');
  await expect(page.getByText('2 gráficos no relatório')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Resumo da partida', exact: true }).uncheck();
  await expect(page.getByText('Rascunho salvo neste dispositivo.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Página 1 do relatório', exact: true })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Página 1 do relatório', exact: true }),
  ).toHaveJSProperty('naturalWidth', 595);
  const draftDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar rascunho' }).click();
  const draftPath = await (await draftDownload).path();
  if (!draftPath) throw new Error('Missing draft download');
  await page.getByLabel('Observações da análise').fill('Alteração temporária');
  await page.getByLabel('Abrir rascunho').setInputFiles(draftPath);
  await expect(page.getByLabel('Observações da análise')).toHaveValue('Priorizar saque na zona 1.');
  await page.getByRole('button', { name: 'Voltar ao scout', exact: true }).click();
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await expect(page.getByLabel('Título do relatório')).toHaveValue('Relatório da comissão');
  await expect(
    page.getByRole('checkbox', { name: 'Resumo da partida', exact: true }),
  ).not.toBeChecked();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Gerar PDF', exact: true }).click();
  const pdfPath = await (await download).path();
  if (!pdfPath) throw new Error('Missing PDF download');
  const pdf = await readFile(pdfPath, 'utf8');
  expect(pdf).toContain('Priorizar saque na zona 1.');
  expect(pdf).toContain('Lucas');
  expect(pdf).not.toContain('DIRECIONAMENTO DO ATAQUE EM CADA P');
  expect(pdf).toContain('Performance das equipes');
  expect(pdf).toMatch(/ RG [\d.]+ w [\s\S]+ S Q/);
  const decoded = pdf.replace(/\\([0-7]{3})/g, (_, octal: string) =>
    String.fromCharCode(parseInt(octal, 8)),
  );
  expect(decoded.indexOf('Performance das equipes')).toBeLessThan(
    decoded.indexOf('Desempenho por rotação'),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.report-editor').scrollIntoViewIfNeeded();
  const size = await page
    .locator('.report-editor')
    .evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
});

test('keeps multiple versions of one chart with independent filters', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await page.getByLabel('Gráfico para adicionar').selectOption('setter_distribution');
  await page.getByRole('combobox', { name: 'Equipe do relatório', exact: true }).selectOption({ label: 'Equipe A' });
  await page.getByRole('combobox', { name: 'Atacante do relatório', exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Posição do levantador no relatório').selectOption('1');
  await page.getByLabel('Título personalizado', { exact: true }).fill('Ataque A em P1');
  const add = page.getByRole('button', {
    name: 'Adicionar gráfico com estes filtros',
    exact: true,
  });
  const list = page.getByRole('list', { name: 'Gráficos selecionados para o relatório' });
  await add.click();
  await expect(list.locator('li')).toHaveCount(1);
  await list.getByRole('button', { name: 'Criar variação', exact: true }).click();
  await expect(page.getByLabel('Posição do levantador no relatório')).toHaveValue('1');
  await page.getByLabel('Posição do levantador no relatório').selectOption('2');
  await page.getByLabel('Título personalizado', { exact: true }).fill('Ataque A em P2');
  await add.click();
  await expect(list.locator('li')).toHaveCount(2);
  await expect(list.locator('li').nth(0)).toContainText('P1');
  await expect(list.locator('li').nth(1)).toContainText('P2');
  await page.getByRole('combobox', { name: 'Equipe do relatório', exact: true }).selectOption({ label: 'Equipe B' });
  await page.getByRole('combobox', { name: 'Atacante do relatório', exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Posição do levantador no relatório').selectOption('3');
  await page.getByLabel('Título personalizado', { exact: true }).fill('Ataque B em P3');
  await add.click();
  await expect(list.locator('li')).toHaveCount(3);
  await expect(list.locator('li').nth(2)).toContainText('Equipe B');
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await expect(page.getByText('3 gráficos no relatório')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Resumo da partida', exact: true }).uncheck();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Gerar PDF', exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error('Missing PDF');
  const pdf = await readFile(path, 'utf8');
  expect(pdf).toContain('/Type /Pages /Count 3');
  for (const title of ['Ataque A em P1', 'Ataque A em P2', 'Ataque B em P3'])
    expect(pdf).toContain(title);
  await page.getByRole('button', { name: 'Escolher e organizar gráficos', exact: true }).click();
  await list.locator('li').nth(1).getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(list.locator('li')).toHaveCount(2);
  await expect(page.getByLabel('Título do gráfico 1', { exact: true })).toHaveValue(
    'Ataque A em P1',
  );
  await expect(page.getByLabel('Título do gráfico 2', { exact: true })).toHaveValue(
    'Ataque B em P3',
  );
});
