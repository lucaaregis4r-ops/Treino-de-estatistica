import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import { createExpectedSideoutMetricDefinition } from './expectedSideout';

function reception(id: string, grade: 'A' | 'B'): ScoutEvent {
  return {
    id,
    matchId: 'match_1',
    rallyId: id,
    sequence: Number(id.slice(-1)),
    teamId: 'team_a',
    playerId: 'receiver',
    skill: 'reception',
    evaluation: grade,
    outcome: grade,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: 1,
    rawCode: id,
    codeProfileId: 'code',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    metadata: { receptionGrade: grade },
  };
}

describe('Expected Sideout', () => {
  const metric = createExpectedSideoutMetricDefinition();

  it('averages empirical rates associated with observed reception grades', () => {
    const result = metric.calculate({
      events: [reception('r1', 'A'), reception('r2', 'A'), reception('r3', 'B')],
      expectedSideoutReferences: [
        { key: 'A', opportunities: 100, successes: 80, rate: 0.8 },
        { key: 'B', opportunities: 50, successes: 25, rate: 0.5 },
      ],
    });

    expect(result).toMatchObject({
      available: true,
      denominator: 3,
      referenceSampleSize: 150,
    });
    expect(result.value).toBeCloseTo(0.7);
    expect(result.numerator).toBeCloseTo(2.1);
  });

  it('is explicitly unavailable when a grade has no adequate reference', () => {
    const result = metric.calculate({ events: [reception('r1', 'A')] });
    expect(result).toMatchObject({
      available: false,
      value: null,
      reasonUnavailable: 'insufficient_reference_sample',
    });
  });
});
