import { afterEach, describe, expect, it } from 'vitest';
import { ScoutTrainerDatabase } from '../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbTrainingSessionRepository } from '../infrastructure/persistence/repositories/IndexedDbTrainingSessionRepository';
import { createDefaultProfileRegistry } from '../profiles/registry/createDefaultProfileRegistry';
import { TrainingService } from './TrainingService';

const databases: ScoutTrainerDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

describe('TrainingService', () => {
  it('generates exercises, reuses the scout pipeline, times attempts, and persists progress', async () => {
    const database = new ScoutTrainerDatabase(`training-${crypto.randomUUID()}`);
    databases.push(database);
    let now = 1000;
    let id = 0;
    const service = new TrainingService(
      new IndexedDbTrainingSessionRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => `id_${++id}`, now: () => now, random: () => 0.4 },
    );

    const started = await service.startSession('training_basic_v1');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.value.currentExercise?.expectedCode).toBe('08S#');

    now = 3000;
    const correct = await service.submit(started.value.session.id, ' 08s# ');
    expect(correct.ok).toBe(true);
    if (!correct.ok) return;
    expect(correct.value.attempt).toMatchObject({ correct: true, durationMs: 2000, errors: [] });

    now = 3500;
    const continued = await service.continueSession(started.value.session.id);
    expect(continued.ok).toBe(true);
    now = 5000;
    const incorrect = await service.submit(started.value.session.id, '09A=');
    expect(incorrect.ok).toBe(true);
    if (!incorrect.ok) return;
    expect(incorrect.value.attempt.errors.map((error) => error.type)).toEqual([
      'player',
      'skill',
      'evaluation',
    ]);
    expect(incorrect.value.workspace.metrics).toMatchObject({
      attempts: 2,
      correct: 1,
      accuracy: 0.5,
    });

    const reloaded = await service.loadSession(started.value.session.id);
    expect(reloaded.ok && reloaded.value.session.attempts).toHaveLength(2);
  });

  it('keeps CBV as training, complexity, and competition profiles composed together', async () => {
    const database = new ScoutTrainerDatabase(`training-cbv-${crypto.randomUUID()}`);
    databases.push(database);
    const service = new TrainingService(
      new IndexedDbTrainingSessionRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => crypto.randomUUID(), now: () => 1000, random: () => 0 },
    );
    const result = await service.startSession('training_cbv_2025_26');
    expect(result.ok && result.value.session).toMatchObject({
      complexityProfileId: 'tactical',
      competitionProfileId: 'cbv_superliga_reference_2025_26',
    });
  });

  it('does not credit tactical details that the operator did not type', async () => {
    const database = new ScoutTrainerDatabase(`training-tactical-${crypto.randomUUID()}`);
    databases.push(database);
    const service = new TrainingService(
      new IndexedDbTrainingSessionRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => crypto.randomUUID(), now: () => 1000, random: () => 0.4 },
    );
    const started = await service.startSession('training_tactical_v1');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const coreOnly = started.value.currentExercise?.expectedEvent.normalizedCode;
    expect(coreOnly).toBeDefined();
    if (!coreOnly) return;
    const submitted = await service.submit(started.value.session.id, coreOnly);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.value.attempt).toMatchObject({
      correct: false,
      tacticalDetailsCaptured: 0,
    });
    const errorTypes = submitted.value.attempt.errors.map((error) => error.type);
    expect(errorTypes).toContain('tactical');
    expect(errorTypes).not.toContain('syntax');
    expect(submitted.value.attempt.errors.map((error) => error.message).join(' ')).not.toContain(
      'detalhe ',
    );
    expect(submitted.value.workspace.currentExercise?.id).toBe(started.value.currentExercise?.id);
  });

  it('keeps valid tactical tokens when only the core evaluation is missing', async () => {
    const database = new ScoutTrainerDatabase(`training-partial-${crypto.randomUUID()}`);
    databases.push(database);
    const service = new TrainingService(
      new IndexedDbTrainingSessionRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => crypto.randomUUID(), now: () => 1000, random: () => 0.4 },
    );
    const started = await service.startSession('training_tactical_v1');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const fullAnswer = started.value.currentExercise?.expectedCode;
    expect(fullAnswer).toBeDefined();
    if (!fullAnswer) return;
    const withoutEvaluation = fullAnswer
      .replace(/^([0-9]{2}[A-Z])[#+!\-/=]/, '$1')
      .toLocaleLowerCase();

    const submitted = await service.submit(started.value.session.id, withoutEvaluation);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    expect(submitted.value.attempt.correct).toBe(false);
    expect(submitted.value.attempt.errors).toEqual([
      expect.objectContaining({
        type: 'syntax',
        message: 'Falta o símbolo de avaliação: use #, +, !, -, / ou =.',
      }),
    ]);
    expect(submitted.value.attempt.tacticalDetailsCaptured).toBe(
      submitted.value.attempt.tacticalDetailsExpected,
    );
    expect(submitted.value.attempt.tacticalDetailsCaptured).toBeGreaterThan(0);
  });

  it('accepts a continuously typed full rally and audits advanced operator metrics', async () => {
    const database = new ScoutTrainerDatabase(`training-advanced-${crypto.randomUUID()}`);
    databases.push(database);
    let now = 1000;
    let id = 0;
    const service = new TrainingService(
      new IndexedDbTrainingSessionRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => `advanced_${++id}`, now: () => now, random: () => 0.4 },
    );
    const started = await service.startSession('training_advanced_v1');
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    let workspace = started.value;
    for (let index = 0; index < 8; index += 1) {
      const exercise = workspace.currentExercise;
      expect(exercise).toBeDefined();
      if (!exercise) return;
      now += 1000;
      const submitted = await service.submit(workspace.session.id, exercise.expectedCode);
      expect(submitted.ok).toBe(true);
      if (!submitted.ok) return;
      if (index === 7) {
        expect(submitted.value.attempt.receivedEvents).toHaveLength(3);
        expect(submitted.value.attempt).toMatchObject({
          correct: true,
          complete: true,
        });
        expect(submitted.value.workspace.metrics).toMatchObject({
          accuracy: 1,
          completeness: 1,
          corrections: 0,
          correctionRate: 0,
          tacticalDetailRate: 1,
        });
        break;
      }
      now += 100;
      const continued = await service.continueSession(workspace.session.id);
      expect(continued.ok).toBe(true);
      if (!continued.ok) return;
      workspace = continued.value;
    }
  });
});
