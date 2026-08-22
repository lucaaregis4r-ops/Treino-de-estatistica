import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../../match/entities/MatchMetadata';
import type { MatchEvent } from '../../match/events/MatchEvent';
import type { SetLineup } from '../../match/lineup/SetLineup';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { Skill } from '../../scout/entities/Skill';
import { RallyContextResolver } from './RallyContextResolver';

const metadata: MatchMetadata = {
  id: 'match_1',
  name: 'Context test',
  teamAId: 'a',
  teamBId: 'b',
  createdAt: 1,
  status: 'in_progress',
  initialServingTeamId: 'a',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'tactical',
};

function lineup(teamId: string): SetLineup {
  return {
    teamId,
    setNumber: 1,
    positions: { 1: 'setter', 2: 's2', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
    slots: {
      setter: { slotId: 'setter', tacticalRole: 'setter', playerId: `${teamId}_1` },
      s2: { slotId: 's2', tacticalRole: 'outside_1', playerId: `${teamId}_2` },
      s3: { slotId: 's3', tacticalRole: 'middle_1', playerId: `${teamId}_3` },
      s4: { slotId: 's4', tacticalRole: 'opposite', playerId: `${teamId}_4` },
      s5: { slotId: 's5', tacticalRole: 'outside_2', playerId: `${teamId}_5` },
      s6: { slotId: 's6', tacticalRole: 'middle_2', playerId: `${teamId}_6` },
    },
  };
}

function scout(
  id: string,
  sequence: number,
  teamId: string,
  skill: Skill,
  evaluation: string,
): ScoutEvent {
  return {
    id,
    matchId: 'match_1',
    rallyId: 'rally_1',
    sequence,
    teamId,
    skill,
    evaluation,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: id,
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
  };
}

const baseEvents: readonly MatchEvent[] = [
  {
    type: 'set_lineup_confirmed',
    id: 'la',
    matchId: 'match_1',
    lineup: lineup('a'),
    sequence: 1,
    timestamp: 1,
  },
  {
    type: 'set_lineup_confirmed',
    id: 'lb',
    matchId: 'match_1',
    lineup: lineup('b'),
    sequence: 2,
    timestamp: 2,
  },
  {
    type: 'rally_started',
    id: 'start',
    matchId: 'match_1',
    rallyId: 'rally_1',
    sequence: 3,
    timestamp: 3,
  },
  { type: 'scout_registered', event: scout('serve', 4, 'a', 'serve', 'positive') },
  { type: 'scout_registered', event: scout('reception', 5, 'b', 'reception', 'excellent') },
  { type: 'scout_registered', event: scout('set', 6, 'b', 'set', 'positive') },
  { type: 'scout_registered', event: scout('attack', 7, 'b', 'attack', 'positive') },
];

describe('RallyContextResolver', () => {
  it('derives phases, expected action, reception quality, serving team, and rotation', () => {
    const projection = new RallyContextResolver().project(metadata, baseEvents);

    expect(projection.contacts.map((contact) => contact.phase)).toEqual([
      'breakpoint',
      'sideout',
      'sideout',
      'sideout',
    ]);
    expect(projection.contacts.at(-1)).toMatchObject({
      receptionForAttack: { receptionEventId: 'reception', grade: 'A' },
      rotation: 1,
      expectedNextAction: { skill: 'block', teamId: 'a', reason: 'attack_defense' },
    });
    expect(projection).toMatchObject({
      servingTeamId: 'a',
      rotationByTeamId: { a: 1, b: 1 },
      expectedNextAction: { skill: 'block', teamId: 'a' },
    });
    expect(baseEvents).toHaveLength(7);
  });

  it('uses the effective correction and reverts it through undo without inventing contacts', () => {
    const correctedReception = scout('replacement', 8, 'b', 'reception', 'negative');
    const correction: MatchEvent = {
      type: 'scout_corrected',
      id: 'correction',
      matchId: 'match_1',
      targetEventId: 'reception',
      previousRawCode: 'reception',
      newRawCode: 'replacement',
      replacementEvent: correctedReception,
      sequence: 8,
      timestamp: 8,
    };
    const corrected = new RallyContextResolver().project(metadata, [...baseEvents, correction]);
    expect(corrected.contacts.at(-1)?.receptionForAttack).toEqual({
      receptionEventId: 'reception',
      grade: 'C',
    });
    expect(corrected.contacts[1]?.historyEventId).toBe('correction');

    const undone = new RallyContextResolver().project(metadata, [
      ...baseEvents,
      correction,
      {
        type: 'scout_undone',
        id: 'undo',
        matchId: 'match_1',
        targetHistoryEventId: 'correction',
        sequence: 9,
        timestamp: 9,
      },
    ]);
    expect(undone.contacts).toHaveLength(4);
    expect(undone.contacts.at(-1)?.receptionForAttack?.grade).toBe('A');
  });

  it('marks contacts after the first attack as transition unless metadata overrides the phase', () => {
    const dig = scout('dig', 8, 'a', 'dig', 'positive');
    const explicit = {
      ...scout('transition_set', 9, 'a', 'set', 'positive'),
      metadata: { phase: 'breakpoint' as const },
    };
    const projection = new RallyContextResolver().project(metadata, [
      ...baseEvents,
      { type: 'scout_registered', event: dig },
      { type: 'scout_registered', event: explicit },
    ]);

    expect(projection.contacts.at(-2)?.phase).toBe('transition');
    expect(projection.contacts.at(-1)?.phase).toBe('breakpoint');
  });

  it('does not suggest another contact after an explicit rally result', () => {
    const projection = new RallyContextResolver().project(metadata, [
      ...baseEvents,
      {
        type: 'rally_result',
        id: 'result',
        matchId: 'match_1',
        rallyId: 'rally_1',
        winnerTeamId: 'b',
        previousServingTeamId: 'a',
        sequence: 8,
        timestamp: 8,
      },
    ]);

    expect(projection.expectedNextAction).toBeUndefined();
    expect(projection.contacts.at(-1)?.expectedNextAction).toBeUndefined();
    expect(projection.servingTeamId).toBe('b');
  });
});
