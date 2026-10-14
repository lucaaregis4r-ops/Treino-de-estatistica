import { expect, test } from '@playwright/test';

test('futsal scout records clock-independent actions, goals and accumulated fouls on desktop and mobile', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida' }).last().click();
  await page.getByLabel('Modalidade').selectOption('futsal');
  await page.getByRole('button', { name: 'Iniciar partida' }).click();

  await expect(page.getByLabel('Relógio da partida')).toContainText('20:00');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })));
  await expect(page.getByText('Relógio rodando', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })));
  await expect(page.getByText('Relógio parado')).toBeVisible();

  await page.getByRole('button', { name: 'Equipe A controla' }).click();
  const court = page.getByRole('application');
  const box = await court.boundingBox();
  if (!box) throw new Error('Quadra de futsal não encontrada');
  await court.click({ position: { x: box.width * .4, y: box.height * .5 } });
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Controle observado: Equipe A/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Mais' }).click();
  await page.getByRole('button', { name: 'Detalhes de revisão' }).click();
  await page.getByLabel('Lance observado', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Organização ofensiva').selectOption('positional');
  await page.getByRole('button', { name: 'Salvar contexto' }).click();
  await expect(page.getByText(/Lance · revisão tática · Ataque posicional/)).toBeVisible();
  await page.getByRole('button', { name: 'Reclassificar contexto' }).click();
  await page.getByLabel('Organização ofensiva').selectOption('transition');
  await page.getByRole('button', { name: 'Salvar reclassificação' }).click();
  await expect(page.getByText(/Lance · revisão tática · Transição \/ contra-ataque/)).toBeVisible();
  await page.getByRole('button', { name: 'Remover contexto' }).click();
  await expect(page.getByText(/Lance · revisão tática/)).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })));
  await expect(page.getByText('Relógio rodando', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Substituição', exact: true }).click();
  await page.getByLabel('Registrar como parcial').check();
  await page.getByRole('button', { name: 'Registrar troca' }).click();
  await expect(page.getByText(/Substituição Equipe A · saída não identificada → entrada não identificada · parcial/)).toBeVisible();
  await expect(page.getByText('Relógio rodando', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Corrigir substituição' }).click();
  await page.getByRole('button', { name: 'Salvar correção' }).click();
  await page.getByRole('button', { name: 'Desfazer último fato' }).click();
  await expect(page.getByText(/Substituição Equipe A · saída não identificada → entrada não identificada · parcial/)).toBeVisible();
  await page.getByRole('button', { name: 'Goleiro-linha' }).click();
  await page.getByRole('button', { name: 'Equipe A: Marcar goleiro-linha' }).click();
  await expect(page.getByText(/Equipe A passa a usar goleiro-linha observado/)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })));
  await expect(page.getByText('Relógio parado')).toBeVisible();

  await page.getByRole('button', { name: 'Preparar finalização' }).click();
  await page.getByRole('button', { name: 'Registrar sem localização' }).click();
  await page.getByRole('button', { name: 'Gol confirmado' }).click();
  await expect(page.getByLabel('Placar e faltas')).toContainText('1');
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Finalização de Equipe A · Gol confirmado para Equipe A/)).toBeVisible();

  await page.getByRole('button', { name: 'Equipe A controla' }).click();
  await page.getByRole('button', { name: 'Preparar finalização' }).click();
  await page.getByRole('button', { name: 'Registrar sem localização' }).click();
  await page.getByRole('button', { name: 'Defendida' }).click();
  await expect(page.getByLabel('Linha do tempo de futsal').getByText(/Finalização de Equipe A · Defendida/)).toBeVisible();
  await page.getByLabel('Aplicar a').selectOption('interval');
  await page.getByLabel('Início do intervalo').selectOption({ index: 1 });
  await page.getByLabel('Fim do intervalo').selectOption({ index: 2 });
  await page.getByLabel('Organização ofensiva').selectOption('set_piece');
  await page.getByRole('button', { name: 'Salvar contexto' }).click();
  await expect(page.getByText(/Intervalo · revisão tática · Bola parada/)).toBeVisible();

  for (let index = 0; index < 6; index += 1) {
    await page.getByRole('button', { name: 'Preparar falta observada' }).click();
    await page.getByRole('button', { name: 'Registrar sem localização' }).click();
  }
  await expect(page.getByLabel('Placar e faltas')).toContainText('6 faltas acumuladas');
  await expect(page.locator('.futsal-foul-warning')).toContainText('6ª ou mais');
  await page.getByRole('button', { name: 'Desfazer último fato' }).click();
  await expect(page.getByLabel('Placar e faltas')).toContainText('5 faltas acumuladas');

  await page.getByText('Ajustar tempo com justificativa').click();
  await page.getByLabel('Minutos decorridos').fill('20');
  await page.getByLabel('Motivo').fill('Validação da virada de período');
  await page.getByRole('button', { name: 'Salvar ajuste' }).click();
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true })));
  await expect(page.getByText('Período encerrado')).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Iniciar 2º período' }).click();
  await expect(page.getByLabel('Relógio da partida')).toContainText('2º período');
  await expect(page.getByLabel('Relógio da partida')).toContainText('20:00');

  await page.getByRole('button', { name: 'Análise' }).click();
  await expect(page.getByRole('heading', { name: 'Análise de futsal' })).toBeVisible();
  const cardColors = await page.locator('.futsal-analysis-cards article').first().evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(cardColors.background).not.toBe('rgb(255, 255, 255)');
  expect(cardColors.text).not.toBe(cardColors.background);
  await expect(page.getByRole('heading', { name: 'Posses completas registradas' })).toBeVisible();
  await expect(page.locator('.observed-unit').first()).toBeVisible();
  await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Finalização por posse classificada')).toHaveCount(0);
  await expect(page.getByText('1/1', { exact: true })).toBeVisible();
  expect(await page.locator('main.futsal-analysis').innerText()).not.toMatch(/\b(xG|xGA|xT)\b/i);
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await csvDownload).suggestedFilename()).toContain('.csv');
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar PDF' }).click();
  expect((await pdfDownload).suggestedFilename()).toContain('.pdf');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
