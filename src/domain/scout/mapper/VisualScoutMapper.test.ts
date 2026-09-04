import { describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { tacticalValue } from '../tactical/TacticalMetadataAdapter';
import type { VisualScoutDraft } from './VisualScoutDraft';
import { VisualScoutMapper } from './VisualScoutMapper';

describe('VisualScoutMapper', () => {
  const mapper = new VisualScoutMapper();
  const cases: readonly {
    readonly name: string;
    readonly draft: VisualScoutDraft;
    readonly outcome: string;
    readonly expectedLocation?: string;
  }[] = [
    {
      name: 'saque',
      draft: {
        teamId: 'a',
        playerNumber: 1,
        skill: 'serve',
        evaluation: 'excellent',
        target: { zoneId: '5' },
      },
      outcome: 'ace',
      expectedLocation: '5',
    },
    {
      name: 'recepção',
      draft: {
        teamId: 'a',
        playerNumber: 2,
        skill: 'reception',
        evaluation: 'positive',
        contactLocation: { zoneId: '6' },
      },
      outcome: 'positive',
      expectedLocation: '6',
    },
    {
      name: 'ataque',
      draft: {
        teamId: 'a',
        playerNumber: 3,
        skill: 'attack',
        evaluation: 'excellent',
        origin: { zoneId: '4' },
        target: { zoneId: '1' },
        attackCombination: 'X1',
      },
      outcome: 'point',
      expectedLocation: '1',
    },
    {
      name: 'bloqueio',
      draft: {
        teamId: 'a',
        playerNumber: 4,
        skill: 'block',
        evaluation: 'excellent',
        contactLocation: { zoneId: '3' },
        blockersCount: 2,
      },
      outcome: 'point',
      expectedLocation: '3',
    },
  ];

  cases.forEach(({ name, draft, outcome, expectedLocation }) => {
    it(`mapeia ${name} sem passar pelo parser`, () => {
      const candidate = mapper.map(draft, defaultCompactV1);
      expect(candidate).toMatchObject({
        playerNumber: draft.playerNumber,
        skill: draft.skill,
        evaluation: draft.evaluation,
        outcome,
      });
      expect(candidate.rawCode).toMatch(/^\[VISUAL\]/);
      expect(candidate.normalizedCode).not.toMatch(/\s/);
      if (draft.skill === 'reception') {
        expect(tacticalValue.originZoneId(candidate.metadata, draft.skill)).toBe(expectedLocation);
      } else {
        expect(tacticalValue.targetZoneId(candidate.metadata, draft.skill)).toBe(expectedLocation);
      }
    });
  });

  it('não inventa metadata quando a seleção visual não contém detalhes táticos', () => {
    const candidate = mapper.map(
      { teamId: 'a', playerNumber: 8, skill: 'attack', evaluation: 'positive' },
      defaultCompactV1,
    );
    expect(candidate.metadata).toBeUndefined();
  });
});
