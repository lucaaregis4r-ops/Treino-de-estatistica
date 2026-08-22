import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoutTrainerDatabase } from '../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbFreeLogSessionRepository } from '../infrastructure/persistence/repositories/IndexedDbFreeLogSessionRepository';
import { FreeLogService } from './FreeLogService';

const databases: ScoutTrainerDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

describe('FreeLogService', () => {
  it('persists arbitrary records without parsing and exports CSV/TXT', async () => {
    const database = new ScoutTrainerDatabase(`free-log-${crypto.randomUUID()}`);
    databases.push(database);
    let id = 0;
    let now = Date.parse('2026-08-10T12:00:00.000Z');
    const service = new FreeLogService(new IndexedDbFreeLogSessionRepository(database), {
      createId: () => `id_${++id}`,
      now: () => now,
    });
    const started = await service.start('Treino livre');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    now += 1000;
    const first = await service.register(started.value.id, ' qualquer observação ');
    expect(first.ok && first.value.entries[0]).toMatchObject({
      sequence: 1,
      value: 'qualquer observação',
    });
    now += 1000;
    const second = await service.register(started.value.id, '01A# 02R+');
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(service.exportTxt(second.value)).toBe('qualquer observação\n01A# 02R+');
    expect(service.exportCsv(second.value)).toContain('2,2026-08-10T12:00:02.000Z,01A# 02R+');
    const reloaded = await service.load(started.value.id);
    expect(reloaded.ok && reloaded.value.entries).toHaveLength(2);
  });
});
