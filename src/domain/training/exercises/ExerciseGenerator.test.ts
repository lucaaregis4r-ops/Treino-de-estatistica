import { describe, expect, it } from 'vitest';
import { advancedProfile, basicProfile } from '../../../profiles/complexity/profiles';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { defaultTrainingProfiles } from '../../../profiles/training/defaultTrainingProfiles';
import { ADVANCED_EXERCISE_KINDS, ExerciseGenerator } from './ExerciseGenerator';

describe('ExerciseGenerator', () => {
  it('preserves the single-code basic exercise contract', () => {
    let id = 0;
    const exercises = new ExerciseGenerator({
      createId: () => `e${++id}`,
      random: () => 0.4,
    }).generate(defaultTrainingProfiles[0], defaultCompactV1, basicProfile);
    expect(exercises[0]).toMatchObject({ kind: 'code', expectedCode: '08S#' });
    expect(exercises[0]?.expectedEvents).toHaveLength(1);
  });

  it('covers all eight advanced tactical exercise families, including a three-contact rally', () => {
    let id = 0;
    const profile = { ...defaultTrainingProfiles[3], exerciseCount: 8 };
    const exercises = new ExerciseGenerator({
      createId: () => `e${++id}`,
      random: () => 0.4,
    }).generate(profile, defaultCompactV1, advancedProfile);
    expect(exercises.map((exercise) => exercise.kind)).toEqual(ADVANCED_EXERCISE_KINDS);
    expect(exercises[7]).toMatchObject({ skillLabel: 'Rally completo' });
    expect(exercises[7]?.expectedEvents.map((event) => event.skill)).toEqual([
      'reception',
      'set',
      'attack',
    ]);
    expect(exercises[7]?.expectedEvents.map((event) => event.playerNumber)).toEqual([8, 9, 10]);
    expect(exercises.every((exercise) => exercise.promptDetails.length > 0)).toBe(true);
    expect(exercises[0]?.expectedCode).toContain('t');
    expect(exercises[0]?.expectedCode).not.toContain(' o');
    expect(exercises[0]?.inputHint).toBe('Código + tipo (yQ/yM/yH/yT) + destino (t).');
    expect(exercises[3]).toMatchObject({ playerRoleLabel: 'Central' });
    expect(exercises[3]?.expectedCode).toContain(' o3 ');
  });
});
