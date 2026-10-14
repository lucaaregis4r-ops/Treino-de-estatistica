import { expect, test, type Page } from '@playwright/test';

async function openMatch(page: Page) {
  await page.goto('/');
  await page.locator('#home-import-backup').setInputFiles('e2e/fixtures/court-workbench.json');
  await expect(page.locator('.gesture-court')).toBeVisible();
  await page.locator('.app-message button').click();
}
async function draw(page: Page, origin = .2, target = .8) {
  const surface = page.locator('.gesture-court .spatial-v2-surface');
  await surface.scrollIntoViewIfNeeded();
  const rect = await surface.boundingBox();
  if (!rect) throw new Error('Missing court');
  await page.mouse.move(rect.x + rect.width * origin, rect.y + rect.height * .7);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * target, rect.y + rect.height * .3, { steps: 4 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Registrar · Enter', exact: true }).click();
}
async function scouts(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('scout-trainer');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(request.error?.message ?? 'Falha ao ler o banco de teste'));
    });
    try {
      const all = await new Promise<{ event: { type: string; event?: { sequence: number; skill: string; evaluation: string } } }[]>((resolve, reject) => {
        const request = db.transaction('events').objectStore('events').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(request.error?.message ?? 'Falha ao ler o banco de teste'));
      });
      return all.map(record => record.event).filter(item => item.type === 'scout_registered' && item.event).map(item => item.event!).sort((a,b) => a.sequence - b.sequence);
    } finally { db.close(); }
  });
}

test('all reception and dig grades persist, survive reload and retain responsive controls', async ({ page }) => {
  await openMatch(page);
  let count = 3;
  for (const label of ['Recepção', 'Defesa']) {
    for (const grade of ['#', '+', '-', '=']) {
      await page.getByRole('group', { name: 'Fundamento da ação' }).getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('button', { name: new RegExp(`Qualidade \\${grade}`) }).click();
      await draw(page);
      await expect(page.locator('.event-list li')).toHaveCount(++count);
    }
  }
  const saved = (await scouts(page)).slice(-8);
  expect(saved.map(e => [e.skill,e.evaluation])).toEqual(['reception','dig'].flatMap(skill => ['excellent','positive','negative','error'].map(evaluation => [skill,evaluation])));
  await page.reload();
  expect((await scouts(page)).slice(-8)).toEqual(saved);
  await page.getByRole('button', { name: 'Vôlei: abrir partidas e manual', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /Qualidade \+/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/contact-quality-mobile.png', fullPage: true });
});

test('serve and negative reception form one spatial stage with auditable inferred pressure', async ({ page }) => {
  await openMatch(page);
  const actions = page.getByRole('group', { name: 'Fundamento da ação' });
  await actions.getByRole('button', { name: 'Saque', exact: true }).click();
  await draw(page);
  await expect(page.locator('.event-list li')).toHaveCount(4);
  await page.locator('.volley-unified-teams').getByRole('button', { name: 'Lagoa AC', exact: true }).click();
  await actions.getByRole('button', { name: 'Recepção', exact: true }).click();
  await page.getByRole('button', { name: /Qualidade -/ }).click();
  await draw(page, .9, .6);
  await expect(page.locator('.event-list li')).toHaveCount(5);
  await actions.getByRole('button', { name: 'Ataque', exact: true }).click();
  await page.getByRole('button', { name: /Qualidade #/ }).click();
  await draw(page, .6, .1);
  await expect(page.locator('.event-list li')).toHaveCount(6);
  await page.getByRole('button', { name: 'Análise', exact: true }).click();
  await page.getByRole('button', { name: 'Mapas e sequências', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Próximas ações observadas', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Equipe executora', exact: true }).selectOption({ label: 'Lagoa AC' });
  await page.getByRole('combobox', { name: 'Fundamento', exact: true }).selectOption('reception');
  await expect(page.locator('.rally-evidence-list')).toContainText('inferida da resposta');
  await page.getByText('Dados completos e como calculamos', { exact: true }).click();
  const matrix = page.getByRole('table', { name: 'Matriz técnica de transições' });
  await expect(matrix).toContainText('Saque');
  await expect(matrix).toContainText('/');
  await expect(matrix).toContainText('Recepção');
  await expect(page.getByRole('region', { name: 'Eficácia por zona' })).toBeVisible();
  const serve = (await scouts(page)).slice(-3)[0];
  expect(serve.evaluation).toBe('neutral'); // derived grade never overwrites the record
  for (const width of [1366,768,390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1366, height: 844 });
  await page.locator('.rally-explorer').screenshot({ path: 'output/exchange-spatial-analysis.png' });
});
