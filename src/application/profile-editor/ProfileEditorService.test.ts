import { afterEach, describe, expect, it } from 'vitest';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbProfileRepository } from '../../infrastructure/persistence/repositories/IndexedDbProfileRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { ProfileEditorService } from './ProfileEditorService';
import { defaultTacticalInput } from '../../profiles/code/default-compact/defaultTacticalInput';

const databases: ScoutTrainerDatabase[] = [];
afterEach(async () => Promise.all(databases.splice(0).map((database) => database.close())));

describe('ProfileEditorService', () => {
  it('validates, registers, serializes, and reloads a custom CodeProfile', async () => {
    const database = new ScoutTrainerDatabase(`profile-editor-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new IndexedDbProfileRepository(database);
    const service = new ProfileEditorService(repository, createDefaultProfileRegistry());
    const saved = await service.save({
      id: 'compact_custom',
      version: '1.0.0',
      name: 'Compact Custom',
      grammar: 'player,skill,evaluation',
      skillsJson: '{"X":"attack","S":"serve"}',
      evaluationsJson: '{"#":"excellent","=":"error"}',
      aliasesJson: '{"*":"#"}',
      tacticalInputJson: JSON.stringify(defaultTacticalInput),
    });
    expect(saved.ok && saved.value).toMatchObject({
      id: 'compact_custom',
      skills: { X: 'attack' },
      tacticalInput: { shortcuts: { quickEditor: 'Alt+T' } },
    });

    const reloaded = new ProfileEditorService(repository, createDefaultProfileRegistry());
    const initialized = await reloaded.initialize();
    expect(
      initialized.ok && initialized.value.some((profile) => profile.id === 'compact_custom'),
    ).toBe(true);
  });

  it('rejects invalid JSON and grammar unsupported by the tokenizer', async () => {
    const database = new ScoutTrainerDatabase(`profile-editor-invalid-${crypto.randomUUID()}`);
    databases.push(database);
    const service = new ProfileEditorService(
      new IndexedDbProfileRepository(database),
      createDefaultProfileRegistry(),
    );
    const base = {
      id: 'custom',
      version: '1.0.0',
      name: 'Custom',
      grammar: 'player,skill,evaluation',
      skillsJson: '{}',
      evaluationsJson: '{}',
      aliasesJson: '{}',
    };
    expect((await service.save({ ...base, skillsJson: '{' })).ok).toBe(false);
    expect((await service.save({ ...base, grammar: 'player,rotation' })).ok).toBe(false);
    expect((await service.save({ ...base, tacticalInputJson: '{"fields":{}}' })).ok).toBe(false);
  });
});
