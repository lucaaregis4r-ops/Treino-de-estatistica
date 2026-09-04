import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import type { TacticalRallyProjection } from '../../../rally/context/TacticalRallyProjection';
import { setterAttackConversionReports } from './setterAttackConversion';

function attack(id: string, sequence: number, outcome: string): ScoutEvent {
  return {
    id,
    matchId: 'match_1',
    rallyId: 'r1',
    sequence,
    teamId: 'team_a',
    playerId: 'attacker',
    skill: 'attack',
    outcome,
    evaluation: outcome,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: id,
    codeProfileId: 'code',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    metadata: { attackCombination: 'X1' },
  };
}

describe('Setter Attack Conversion', () => {
  it('groups organized attacks by setter context without explicit set events', () => {
    const events = [attack('a1', 1, 'point'), attack('a2', 2, 'error'), attack('a3', 3, 'blocked')];
    const tacticalRally: TacticalRallyProjection = {
      contacts: events.map((event) => ({
        sourceEventId: event.id,
        historyEventId: event.id,
        rallyId: event.rallyId,
        teamId: event.teamId,
        skill: event.skill,
        phase: 'sideout',
        setterPlayerId: 'setter',
        setterPosition: 2,
        receptionForAttack: { receptionEventId: 'reception', grade: 'A' },
      })),
      rallies: [],
      rotationByTeamId: {},
    };
    expect(setterAttackConversionReports(events, tacticalRally)).toEqual([
      expect.objectContaining({
        setterPlayerId: 'setter',
        setterPosition: 2,
        attackerPlayerId: 'attacker',
        receptionGrade: 'A',
        phase: 'sideout',
        attackCombination: 'X1',
        volume: 3,
        points: 1,
        errors: 1,
        blocked: 1,
      }),
    ]);
  });
});
