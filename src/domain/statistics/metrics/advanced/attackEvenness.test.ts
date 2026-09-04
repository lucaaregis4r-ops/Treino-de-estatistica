import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import { attackEvenness, createAttackEvennessMetricDefinition } from './attackEvenness';

describe('Attack Evenness', () => {
  it('calculates one minus half the absolute distribution distance', () => {
    expect(attackEvenness([5, 5], [5, 5])).toBe(1);
    expect(attackEvenness([10, 0], [5, 5])).toBe(0.5);
    expect(attackEvenness([], [])).toBeNull();
    expect(attackEvenness([1], [1, 1])).toBeNull();
  });

  it('reports observed attacker shares against an explicit reference', () => {
    const attack = (id: string, playerId: string): ScoutEvent => ({
      id,
      matchId: 'match_1',
      rallyId: id,
      sequence: Number(id.slice(-1)),
      teamId: 'team_a',
      playerId,
      skill: 'attack',
      setNumber: 1,
      scoreBefore: { teamA: 0, teamB: 0 },
      timestamp: 1,
      rawCode: id,
      codeProfileId: 'code',
      codeProfileVersion: '1.0.0',
      complexityProfileId: 'tactical',
    });
    const result = createAttackEvennessMetricDefinition().calculate({
      events: [attack('a1', 'p1'), attack('a2', 'p1')],
      attackEvennessReference: [
        { playerId: 'p1', expectedShare: 0.5 },
        { playerId: 'p2', expectedShare: 0.5 },
      ],
    });
    expect(result).toMatchObject({ available: true, value: 0.5, denominator: 2 });
    expect(result.breakdown?.map((row) => row.numerator)).toEqual([2, 0]);
  });
});
