import { describe, expect, it } from 'vitest';
import { TrainingComparator } from './TrainingComparator';

const expected = {
  playerNumber: 8,
  skill: 'attack' as const,
  evaluation: 'excellent',
  outcome: 'point',
  rawCode: '08A#',
  normalizedCode: '08A#',
};

describe('TrainingComparator', () => {
  const comparator = new TrainingComparator();
  it('identifies each semantic component independently', () => {
    const result = comparator.compare(expected, {
      ...expected,
      playerNumber: 9,
      skill: 'serve',
      evaluation: 'error',
    });
    expect(result.correct).toBe(false);
    expect(result.errors.map((error) => error.type)).toEqual(['player', 'skill', 'evaluation']);
  });
  it('classifies pipeline parsing failures as syntax errors', () => {
    expect(
      comparator.compare(expected, undefined, { code: 'unknown_skill', message: 'Unknown skill.' })
        .errors[0]?.type,
    ).toBe('syntax');
  });
});
