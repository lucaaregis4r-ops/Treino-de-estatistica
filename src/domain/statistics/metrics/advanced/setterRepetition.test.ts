import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import { setterRepetitionReports } from './setterRepetition';

function attack(
  id: string,
  rallyId: string,
  sequence: number,
  playerId: string,
  outcome: string,
): ScoutEvent {
  return {
    id,
    matchId: 'match_1',
    rallyId,
    sequence,
    teamId: 'team_a',
    playerId,
    setterPlayerId: 'setter',
    setterPosition: 1,
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
  };
}

describe('Setter Repetition', () => {
  it('counts next-attack opportunities by outcome and within rally', () => {
    const rows = setterRepetitionReports([
      attack('a1', 'r1', 1, 'p1', 'point'),
      attack('a2', 'r2', 2, 'p1', 'error'),
      attack('a3', 'r2', 3, 'p2', 'blocked'),
      attack('a4', 'r2', 4, 'p2', 'point'),
    ]);
    expect(
      rows.find((row) => row.attackerPlayerId === 'p1' && row.category === 'overall'),
    ).toMatchObject({
      opportunities: 2,
      repeats: 1,
    });
    expect(
      rows.find((row) => row.attackerPlayerId === 'p1' && row.category === 'after_point'),
    ).toMatchObject({
      opportunities: 1,
      repeats: 1,
    });
    expect(
      rows.find((row) => row.attackerPlayerId === 'p2' && row.category === 'within_rally'),
    ).toMatchObject({
      opportunities: 1,
      repeats: 1,
    });
  });
});
