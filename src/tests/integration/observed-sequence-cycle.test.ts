import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbMatchBackupRepository } from '../../infrastructure/persistence/backup/IndexedDbMatchBackupRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';

const databases: ScoutTrainerDatabase[] = [];
function serviceFor(database: ScoutTrainerDatabase) {
  return new ScoutTrainerService(
    new IndexedDbMatchRepository(database), new IndexedDbEventRepository(database),
    new IndexedDbTeamRepository(database), new IndexedDbPlayerRepository(database),
    createDefaultProfileRegistry(),
  ).enableBackupRestore(new IndexedDbMatchBackupRepository(database));
}
afterEach(async () => { for (const database of databases.splice(0)) await database.close(); });

it('rebuilds the same futsal sequence and source IDs after reopening and importing a backup', async () => {
  const database = new ScoutTrainerDatabase(`futsal-sequence-${crypto.randomUUID()}`); databases.push(database);
  const service = serviceFor(database);
  const created = await service.createMatch({ sport: 'futsal', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const a = created.value.teams[0].id;
  const save = async (draft: Parameters<typeof service.registerFutsalFact>[1]) => {
    const result = await service.registerFutsalFact(matchId, draft);
    if (!result.ok) throw result.error;
    return result.value;
  };
  await save({ kind: 'control', state: 'team', controlledTeamId: a, coverage: 'continuous', observation: 'observed', position: { x: .2, y: .5 } });
  await save({ kind: 'shot', shootingTeamId: a, outcome: 'saved', observation: 'observed', position: { x: .65, y: .5 }, destination: { x: .9, y: .5 } });
  const scored = await save({ kind: 'shot', shootingTeamId: a, outcome: 'goal', beneficiaryTeamId: a, observation: 'observed', position: { x: .7, y: .5 }, destination: { x: .98, y: .5 } });
  const original = scored.observedSequences;
  expect(original.units).toHaveLength(1);
  expect(original.units[0]).toMatchObject({ coverage: 'complete', outcome: 'goal', eligibleForOutcome: true });
  expect(original.units[0].steps.map(step => step.sourceId)).toHaveLength(3);

  const backup = await service.exportJson(matchId); if (!backup.ok) throw backup.error;
  expect((JSON.parse(backup.value) as { schemaVersion: string }).schemaVersion).toBe('1.3.0');
  const reopened = await serviceFor(database).loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  expect(reopened.value.observedSequences).toEqual(original);

  const targetDatabase = new ScoutTrainerDatabase(`futsal-sequence-restore-${crypto.randomUUID()}`); databases.push(targetDatabase);
  const restored = await serviceFor(targetDatabase).importJson(backup.value); if (!restored.ok) throw restored.error;
  expect(restored.value.observedSequences).toEqual(original);
});
