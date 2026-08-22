import { describe, expect, it } from 'vitest';
import { DEFAULT_INDOOR_SCORING_RULES, setWinner } from './SetScoringRules';

describe('setWinner', () => {
  it('finishes 25-23, keeps 24-24 open, and uses 15 with a two-point lead in set five', () => {
    expect(setWinner({ teamA: 25, teamB: 23 }, 1, DEFAULT_INDOOR_SCORING_RULES, 'a', 'b')).toBe(
      'a',
    );
    expect(
      setWinner({ teamA: 24, teamB: 24 }, 1, DEFAULT_INDOOR_SCORING_RULES, 'a', 'b'),
    ).toBeUndefined();
    expect(setWinner({ teamA: 15, teamB: 13 }, 5, DEFAULT_INDOOR_SCORING_RULES, 'a', 'b')).toBe(
      'a',
    );
    expect(
      setWinner({ teamA: 15, teamB: 14 }, 5, DEFAULT_INDOOR_SCORING_RULES, 'a', 'b'),
    ).toBeUndefined();
  });
});
