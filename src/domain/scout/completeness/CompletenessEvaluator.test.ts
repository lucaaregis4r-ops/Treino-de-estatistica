import { describe, expect, it } from 'vitest';
import { tacticalProfile } from '../../../profiles/complexity/profiles';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from '../validators/ScoutValidationContext';
import { CompletenessEvaluator } from './CompletenessEvaluator';

const candidate: CanonicalScoutEventCandidate = {
  playerNumber: 1,
  skill: 'attack',
  evaluation: 'excellent',
  outcome: 'point',
  rawCode: '01A#',
  normalizedCode: '01A#',
};

const context: ScoutValidationContext = {
  matchId: 'match',
  rallyId: 'rally',
  teamId: 'team',
  setNumber: 1,
  scoreBefore: { teamA: 0, teamB: 0 },
  sequence: 1,
  roster: [{ id: 'player', teamId: 'team', number: 1 }],
};

describe('CompletenessEvaluator', () => {
  it('classifies a valid tactical core as partial without making it invalid', () => {
    expect(new CompletenessEvaluator().evaluate(candidate, tacticalProfile, context)).toEqual({
      status: 'partial',
      missingRecommendedFields: ['direction'],
    });
  });

  it('becomes complete when all recommended tactical fields are captured', () => {
    const completeCandidate: CanonicalScoutEventCandidate = {
      ...candidate,
      metadata: {
        skillType: 'power',
        originZone: 4,
        targetZone: 1,
        direction: 'diagonal',
      },
    };

    expect(
      new CompletenessEvaluator().evaluate(completeCandidate, tacticalProfile, context),
    ).toEqual({ status: 'complete', missingRecommendedFields: [] });
  });
});
