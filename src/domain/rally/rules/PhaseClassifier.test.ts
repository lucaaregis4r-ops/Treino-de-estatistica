import { describe, expect, it } from 'vitest';
import { PhaseClassifier } from './PhaseClassifier';

describe('PhaseClassifier', () => {
  const classifier = new PhaseClassifier();

  it('classifies sideout, breakpoint, and transition from rally context', () => {
    expect(
      classifier.classify({ eventTeamId: 'b', receivingTeamId: 'b', servingTeamId: 'a' }),
    ).toBe('sideout');
    expect(
      classifier.classify({ eventTeamId: 'a', receivingTeamId: 'b', servingTeamId: 'a' }),
    ).toBe('breakpoint');
    expect(
      classifier.classify({
        eventTeamId: 'a',
        receivingTeamId: 'b',
        servingTeamId: 'a',
        hasPreviousAttack: true,
      }),
    ).toBe('transition');
  });
});
