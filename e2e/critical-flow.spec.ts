import { expect, test } from '@playwright/test';

test('keeps a continuous scout line and exposes the code manual', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Códigos' })).toBeVisible();
  await expect(page.getByText('*08S#a12R+*03E+*10A#')).toBeVisible();
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  const input = page.getByLabel('Digite o código');
  await input.fill('*01A#*02S+a03R#');
  await input.press('Enter');
  await expect(page.getByText('*01A#', { exact: true })).toBeVisible();
  await expect(page.getByText('*02S+', { exact: true })).toBeVisible();
  await expect(page.getByText('A03R#', { exact: true })).toBeVisible();
  await expect(input).toHaveValue(/^\*01A#\*02S\+a03R#(?:\*01S)?$/);
});

test('prefills the next server from score and rotation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  const input = page.getByLabel('Digite o código');
  await expect(input).toHaveValue('*01S');
  await input.fill('*01S#');
  await input.press('Enter');
  await expect(input).toHaveValue('*01S#*01S');
  await input.fill('*01S#*01S=');
  await input.press('Enter');
  await expect(input).toHaveValue('*01S#*01S=a08S');
  await expect(page.locator('.serving-inline')).toContainText('Equipe B');
  await expect(page.locator('.serving-inline')).toContainText('#08');
});

test('creates, scouts, recovers, exports, and records a training attempt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('radio', { name: /Tático/ }).click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();

  const scoutCode = page.getByLabel('Digite o código');
  await scoutCode.fill('*01A#');
  await scoutCode.press('Enter');
  await expect(page.locator('.event-list code')).toHaveText('*01A#');
  await expect(scoutCode).toHaveValue('*01A#*01S');
  await expect(page.locator('.score-center span').first()).toHaveText('1');
  await expect(page.locator('.serving-inline')).toContainText('Equipe A');
  await expect(page.locator('.serving-inline')).toContainText('#01');
  await expect(page.locator('.partial-badge')).toContainText('parcial');

  await page.getByRole('button', { name: 'Completar', exact: true }).click();
  await page.getByLabel('Tipo da ação').fill('potência');
  await page.getByLabel('Zona de origem').selectOption('4');
  await page.getByLabel('Zona de destino').selectOption('1');
  await page.getByLabel('Direção').selectOption('diagonal');
  await page.getByLabel('Corrigindo evento').fill('*01A+');
  await page.getByLabel('Corrigindo evento').press('Enter');
  await expect(page.locator('.event-list code')).toHaveText('*01A+');
  await expect(page.locator('.partial-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('.event-list code')).toHaveText('*01A#');
  await page.getByRole('button', { name: 'Refazer' }).click();
  await expect(page.locator('.event-list code')).toHaveText('*01A+');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('.event-list code')).toHaveText('*01A#');

  await page.getByRole('button', { name: 'Completar', exact: true }).click();
  await page.getByLabel('Corrigindo evento').fill('*01A+');
  await page.getByLabel('Corrigindo evento').press('Enter');
  await page.reload();
  await page.getByRole('button', { name: /Equipe A x Equipe B/ }).click();
  await expect(page.locator('.event-list code')).toHaveText('*01A+');

  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Distribuições e eficiência' })).toBeVisible();
  await page.getByLabel('Grupo').selectOption('attack');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const backupPath = await download.path();
  if (!backupPath) throw new Error('Exported backup path is unavailable.');
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await page.getByLabel('Restaurar backup JSON').setInputFiles(backupPath);
  await expect(page.getByText('Backup restaurado e validado com sucesso.')).toBeVisible();

  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Começar treino' }).click();
  await page.getByLabel('Seu código').fill('00X?');
  await page.getByLabel('Seu código').press('Enter');
  await expect(page.getByText('Revisar código')).toBeVisible();
});

test('registers a complete tactical scout using only configured keyboard shortcuts', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('radio', { name: /Tático/ }).click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();

  const scoutCode = page.getByLabel('Digite o código');
  await scoutCode.press('Alt+T');
  const tacticalCommand = page.getByLabel('Comando tático');
  await expect(tacticalCommand).toBeFocused();
  await tacticalCommand.fill('o4 t1 dd ypotencia');
  await tacticalCommand.press('Enter');
  await expect(scoutCode).toBeFocused();
  await scoutCode.pressSequentially('*01A+');
  await scoutCode.press('Enter');

  await expect(page.locator('.event-list code')).toHaveText('*01A+');
  await expect(page.locator('.partial-badge')).toHaveCount(0);
  await expect(page.getByLabel('Zona de origem')).toHaveValue('');
  await expect(page.getByLabel('Zona de destino')).toHaveValue('');

  await page.locator('summary').filter({ hasText: 'Detalhes' }).click();
  await page.getByRole('button', { name: 'Zona 4', exact: true }).click();
  await page.getByRole('button', { name: 'Zona 1', exact: true }).click();
  await expect(page.getByLabel('Zona de origem')).toHaveValue('4');
  await expect(page.getByLabel('Zona de destino')).toHaveValue('1');
  await expect(page.getByText('4 → 1', { exact: true })).toBeVisible();

  const court = page.getByLabel('Quadra indoor regulamentar — posições 1 a 6');
  const box = await court.boundingBox();
  if (!box) throw new Error('Tactical court bounds are unavailable.');
  await court.dispatchEvent('pointerdown', {
    clientX: box.x + box.width * 0.05,
    clientY: box.y + box.height * 0.95,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
  });
  await court.dispatchEvent('pointermove', {
    clientX: box.x + box.width * 0.95,
    clientY: box.y + box.height * 0.05,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
  });
  await court.dispatchEvent('pointerup', {
    clientX: box.x + box.width * 0.95,
    clientY: box.y + box.height * 0.05,
    button: 0,
    buttons: 0,
    pointerId: 1,
    pointerType: 'mouse',
  });
  await expect(page.getByText('Trajetória desenhada', { exact: true })).toBeVisible();
  await page.getByLabel('Abrir resumo').click();
  await page.getByLabel('Grupo').selectOption('attack');
  await expect(page.getByLabel('Matriz de zonas: Origem do ataque')).toContainText('Z4');
  await expect(page.getByLabel('Matriz de zonas: Origem do ataque')).toContainText('1/1');
});

test('keeps an inline tactical suffix attached to its event', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('radio', { name: /Tático/ }).click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();

  const input = page.getByLabel('Digite o código');
  await input.fill('*01S#*01S!T5');
  await input.press('Enter');

  await expect(page.locator('.event-list li')).toHaveCount(2);
  const enrichedEvent = page.locator('.event-list li').first();
  await expect(enrichedEvent.locator('code')).toHaveText('*01S!');
  await expect(enrichedEvent).toContainText('tipo da ação');
  await expect(enrichedEvent).not.toContainText('zona de destino');
});

test('runs an advanced tactical exercise and exposes operator quality metrics', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Treino', exact: true }).click();
  await page.getByRole('radio', { name: /Avançado/ }).click();
  await page.getByRole('button', { name: 'Começar treino' }).click();

  await expect(page.locator('.exercise-details')).toContainText('Tipo de saque');
  await expect(page.locator('.exercise-details')).toContainText('Zona final');
  await expect(page.locator('.exercise-details')).not.toContainText('Zona inicial');
  const trainingInput = page.getByLabel('Seu código');
  const expectedCode = await trainingInput.getAttribute('placeholder');
  if (!expectedCode) throw new Error('Expected training code is unavailable.');
  await trainingInput.fill(expectedCode);
  await trainingInput.press('Enter');

  await expect(page.getByRole('heading', { name: 'Código correto' })).toBeVisible();
  await expect(page.locator('.training-live-metrics')).toContainText('Completude 100%');
  await expect(page.locator('.training-live-metrics')).toContainText('Detalhes 100%');
});

test('exports a complete match package to a chosen folder and persists free records', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const files: Record<string, string> = {};
    let folder = '';
    Object.assign(globalThis, {
      __folderExport: {
        files,
        get folder() {
          return folder;
        },
      },
      showDirectoryPicker: () =>
        Promise.resolve({
          name: 'Google Drive',
          getDirectoryHandle(name: string) {
            folder = name;
            return Promise.resolve({
              name,
              getDirectoryHandle() {
                return Promise.resolve(this);
              },
              getFileHandle(fileName: string) {
                return Promise.resolve({
                  createWritable() {
                    return Promise.resolve({
                      write(value: string) {
                        files[fileName] = value;
                        return Promise.resolve();
                      },
                      close: () => Promise.resolve(),
                    });
                  },
                });
              },
            });
          },
        }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nova partida', exact: true }).first().click();
  await page.getByRole('button', { name: 'Criar e iniciar scout' }).click();
  await page.getByRole('button', { name: 'Resumo', exact: true }).click();
  await page.getByRole('button', { name: 'Conectar pasta' }).click();
  await expect(page.getByText('Conectada: Google Drive')).toBeVisible();
  await page.getByRole('button', { name: 'Exportar pacote agora' }).click();

  const exported = await page.evaluate(
    () =>
      (
        globalThis as unknown as {
          __folderExport: { folder: string; files: Record<string, string> };
        }
      ).__folderExport,
  );
  expect(exported.folder).toMatch(/^Equipe-A-x-Equipe-B_\d{4}-\d{2}-\d{2}_/);
  expect(Object.keys(exported.files).sort()).toEqual([
    'codigos.txt',
    'partida.json',
    'placar-sets.csv',
    'scouts.csv',
  ]);
  expect(exported.files['placar-sets.csv']).toContain('set,team_a,points_a');

  await page.getByRole('button', { name: 'Livre', exact: true }).click();
  await page.getByLabel('Nome da sessão').fill('Treino sem parser');
  await page.getByRole('button', { name: 'Novo registro livre' }).click();
  await page.getByLabel('Digite qualquer registro').fill('observação livre 01A#');
  await page.getByLabel('Digite qualquer registro').press('Enter');
  await expect(page.locator('.free-log-entries code')).toHaveText('observação livre 01A#');

  await page.reload();
  await page.getByRole('button', { name: 'Livre', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir' }).click();
  await expect(page.locator('.free-log-entries code')).toHaveText('observação livre 01A#');
});
