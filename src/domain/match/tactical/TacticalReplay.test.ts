import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../entities/MatchMetadata';
import type { MatchEvent, SubstitutionEvent } from '../events/MatchEvent';
import type { SetLineup } from '../lineup/SetLineup';
import { replayMatch } from '../replay/MatchReplayService';

const metadata: MatchMetadata = {
  id: 'match',
  name: 'A x B',
  teamAId: 'team_a',
  teamBId: 'team_b',
  createdAt: 1,
  status: 'in_progress',
  initialServingTeamId: 'team_a',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};

const lineup: SetLineup = {
  teamId: 'team_a',
  setNumber: 1,
  positions: { 1: 'setter', 2: 'opposite', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
  slots: {
    setter: {
      slotId: 'setter',
      tacticalRole: 'setter',
      playerId: 'setter_1',
      activeRole: 'setter',
    },
    opposite: {
      slotId: 'opposite',
      tacticalRole: 'opposite',
      playerId: 'opposite_1',
      activeRole: 'opposite',
    },
    s3: { slotId: 's3', tacticalRole: 'custom', playerId: 'p3', activeRole: 'custom' },
    s4: { slotId: 's4', tacticalRole: 'custom', playerId: 'p4', activeRole: 'custom' },
    s5: { slotId: 's5', tacticalRole: 'custom', playerId: 'p5', activeRole: 'custom' },
    s6: { slotId: 's6', tacticalRole: 'custom', playerId: 'p6', activeRole: 'custom' },
  },
};

const substitution = (
  id: string,
  sequence: number,
  slotId: string,
  playerOutId: string,
  playerInId: string,
  playerOutRole: 'setter' | 'opposite',
  playerInRole: 'setter' | 'opposite',
): SubstitutionEvent => ({
  type: 'substitution_made',
  id,
  matchId: 'match',
  teamId: 'team_a',
  setNumber: 1,
  slotId,
  playerOutId,
  playerInId,
  playerOutRole,
  playerInRole,
  score: { teamA: 10, teamB: 9 },
  rotationPositionAtSubstitution: slotId === 'setter' ? 1 : 2,
  sequence,
  timestamp: sequence,
});

const initial: MatchEvent = {
  type: 'set_lineup_confirmed',
  id: 'lineup',
  matchId: 'match',
  lineup,
  sequence: 1,
  timestamp: 1,
};

describe('tactical substitution replay', () => {
  it('detects inversion, closes the window at the rally and detects the return', () => {
    const events: MatchEvent[] = [
      initial,
      substitution('sub_1', 2, 'setter', 'setter_1', 'attacker_2', 'setter', 'opposite'),
      substitution('sub_2', 3, 'opposite', 'opposite_1', 'setter_2', 'opposite', 'setter'),
      {
        type: 'rally_started',
        id: 'rally_started',
        matchId: 'match',
        rallyId: 'rally',
        sequence: 4,
        timestamp: 4,
      },
      substitution('sub_3', 5, 'setter', 'attacker_2', 'setter_1', 'opposite', 'setter'),
      substitution('sub_4', 6, 'opposite', 'setter_2', 'opposite_1', 'setter', 'opposite'),
    ];
    const state = replayMatch(metadata, events);

    expect(state.tacticalStateByTeamId.team_a).toMatchObject({
      activeSetterPlayerId: 'setter_1',
      activeSetterPosition: 1,
      formationState: 'normal',
    });
    expect(state.derivedSubstitutionGroups.map((group) => group.pattern)).toEqual([
      'five_one_inversion',
      'five_one_return',
    ]);
  });

  it('recalculates the tactical state through undo and redo', () => {
    const baseEvents: MatchEvent[] = [
      initial,
      substitution('sub_1', 2, 'setter', 'setter_1', 'attacker_2', 'setter', 'opposite'),
      substitution('sub_2', 3, 'opposite', 'opposite_1', 'setter_2', 'opposite', 'setter'),
    ];
    const undone = replayMatch(metadata, [
      ...baseEvents,
      {
        type: 'scout_undone',
        id: 'undo',
        matchId: 'match',
        targetHistoryEventId: 'sub_2',
        sequence: 4,
        timestamp: 4,
      },
    ]);
    expect(undone.tacticalStateByTeamId.team_a.formationState).toBe('unknown');

    const redone = replayMatch(metadata, [
      ...baseEvents,
      {
        type: 'scout_undone',
        id: 'undo',
        matchId: 'match',
        targetHistoryEventId: 'sub_2',
        sequence: 4,
        timestamp: 4,
      },
      {
        type: 'scout_redone',
        id: 'redo',
        matchId: 'match',
        targetUndoEventId: 'undo',
        sequence: 5,
        timestamp: 5,
      },
    ]);
    expect(redone.tacticalStateByTeamId.team_a.formationState).toBe('five_one_inversion');
  });
});
