import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import { createExpectedBreakpointMetricDefinition } from './expectedBreakpoint';

function serve(id: string, evaluation: string): ScoutEvent {
  return {
    id,
    matchId: 'match_1',
    rallyId: id,
    sequence: Number(id.slice(-1)),
    teamId: 'team_a',
    playerId: 'server',
    skill: 'serve',
    evaluation,
    outcome: evaluation,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: 1,
    rawCode: id,
    codeProfileId: 'code',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
  };
}

describe('Expected Breakpoint', () => {
  it('averages empirical breakpoint rates by serve evaluation', () => {
    const result = createExpectedBreakpointMetricDefinition().calculate({
      events: [serve('s1', 'ace'), serve('s2', 'continuation')],
      expectedBreakpointReferences: [
        { key: 'ace', opportunities: 20, successes: 20, rate: 1 },
        { key: 'continuation', opportunities: 80, successes: 20, rate: 0.25 },
      ],
    });
    expect(result).toMatchObject({
      available: true,
      value: 0.625,
      numerator: 1.25,
      denominator: 2,
      referenceSampleSize: 100,
    });
  });

  it('does not invent a serve baseline', () => {
    const result = createExpectedBreakpointMetricDefinition().calculate({
      events: [serve('s1', 'ace')],
      expectedBreakpointReferences: [],
    });
    expect(result.reasonUnavailable).toBe('insufficient_reference_sample');
  });
});
