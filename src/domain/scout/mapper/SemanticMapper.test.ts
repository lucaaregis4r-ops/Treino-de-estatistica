import { describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { SemanticMapper } from './SemanticMapper';

describe('SemanticMapper', () => {
  it.each([
    ['A', '#', 'attack', 'point'],
    ['R', '#', 'reception', 'perfect'],
    ['S', '#', 'serve', 'ace'],
    ['B', '#', 'block', 'point'],
    ['A', '+', 'attack', 'positive'],
  ] as const)('maps %s%s to %s/%s', (skillCode, evaluationCode, skill, outcome) => {
    const mapper = new SemanticMapper();
    const result = mapper.map(
      { playerNumber: 8, skillCode, evaluationCode },
      {
        rawCode: `08${skillCode}${evaluationCode}`,
        normalizedCode: `08${skillCode}${evaluationCode}`,
      },
      defaultCompactV1,
    );

    expect(result.ok && result.value.skill).toBe(skill);
    expect(result.ok && result.value.outcome).toBe(outcome);
  });
});
