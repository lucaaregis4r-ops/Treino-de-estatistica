import { describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import type { CanonicalScoutEventCandidate } from './CanonicalScoutEventCandidate';
import { HybridScoutMerger } from './HybridScoutMerger';

const typed: CanonicalScoutEventCandidate = {
  playerNumber: 8,
  skill: 'attack',
  evaluation: 'excellent',
  outcome: 'point',
  rawCode: '08A#',
  normalizedCode: '08A#',
  metadata: {
    schemaVersion: '2.0.0',
    tactical: { attack: { attackType: 'power', trajectory: { origin: { zoneId: '4' } } } },
  },
};

describe('HybridScoutMerger', () => {
  it('enriquece somente campos táticos ausentes e preserva o texto', () => {
    const result = new HybridScoutMerger().merge({
      typedTeamId: 'a',
      typedCandidate: typed,
      visualDraft: {
        teamId: 'a',
        playerNumber: 8,
        skill: 'attack',
        evaluation: 'excellent',
        origin: { zoneId: '2' },
        target: { zoneId: '1' },
        skillType: 'tip',
      },
      codeProfile: defaultCompactV1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      rawCode: '08A#',
      normalizedCode: '08A#',
      metadata: {
        tactical: {
          attack: {
            attackType: 'power',
            trajectory: { origin: { zoneId: '4' }, target: { zoneId: '1' } },
          },
        },
      },
    });
  });

  it.each([
    ['teamId', { teamId: 'b' }],
    ['playerNumber', { playerNumber: 9 }],
    ['skill', { skill: 'serve' as const }],
    ['evaluation', { evaluation: 'positive' }],
  ])('expõe conflito de %s', (field, override) => {
    const result = new HybridScoutMerger().merge({
      typedTeamId: 'a',
      typedCandidate: typed,
      visualDraft: {
        teamId: 'a',
        playerNumber: 8,
        skill: 'attack',
        evaluation: 'excellent',
        ...override,
      },
      codeProfile: defaultCompactV1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ code: 'hybrid_scout_conflict', path: field }),
      );
    }
  });
});
