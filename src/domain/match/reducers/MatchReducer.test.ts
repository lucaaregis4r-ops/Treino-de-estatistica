import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../entities/MatchMetadata';
import type { MatchEvent } from '../events/MatchEvent';
import { reduceMatch } from './MatchReducer';
import { replayMatch } from '../replay/MatchReplayService';
import { createInitialMatchState } from '../state/MatchState';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { SetLineup } from '../lineup/SetLineup';

const metadata: MatchMetadata = {
  id: 'match_1',
  name: 'Team A vs Team B',
  teamAId: 'team_a',
  teamBId: 'team_b',
  createdAt: 1,
  status: 'in_progress',
  initialServingTeamId: 'team_a',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};

const scout: ScoutEvent = {
  id: 'event_scout_1',
  matchId: metadata.id,
  rallyId: 'rally_1',
  sequence: 2,
  teamId: 'team_a',
  playerId: 'team_a_08',
  skill: 'serve',
  outcome: 'ace',
  evaluation: 'excellent',
  setNumber: 1,
  scoreBefore: { teamA: 0, teamB: 0 },
  timestamp: 2,
  rawCode: '08S#',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};

const events: readonly MatchEvent[] = [
  {
    type: 'rally_started',
    id: 'system_1',
    matchId: metadata.id,
    rallyId: 'rally_1',
    sequence: 1,
    timestamp: 1,
  },
  { type: 'scout_registered', event: scout },
  {
    type: 'score_changed',
    id: 'system_3',
    matchId: metadata.id,
    setNumber: 1,
    score: { teamA: 1, teamB: 0 },
    sequence: 3,
    timestamp: 3,
  },
  {
    type: 'rally_ended',
    id: 'system_4',
    matchId: metadata.id,
    rallyId: 'rally_1',
    winningTeamId: 'team_a',
    sequence: 4,
    timestamp: 4,
  },
  {
    type: 'serving_team_changed',
    id: 'system_5',
    matchId: metadata.id,
    servingTeamId: 'team_b',
    sequence: 5,
    timestamp: 5,
  },
  {
    type: 'set_started',
    id: 'system_6',
    matchId: metadata.id,
    setNumber: 2,
    initialScore: { teamA: 0, teamB: 0 },
    servingTeamId: 'team_b',
    sequence: 6,
    timestamp: 6,
  },
];

describe('MatchReducer', () => {
  it('replays score, set, serving team, and rally from the event stream', () => {
    const state = replayMatch(metadata, events);

    expect(state).toMatchObject({
      currentSet: 2,
      score: { teamA: 0, teamB: 0 },
      servingTeamId: 'team_b',
      lastSequence: 6,
    });
    expect(state.sets).toEqual([
      { setNumber: 1, score: { teamA: 1, teamB: 0 }, completed: true },
      { setNumber: 2, score: { teamA: 0, teamB: 0 }, completed: false },
    ]);
    expect(state.currentRally).toMatchObject({
      rallyId: 'rally_1',
      status: 'ended',
      winningTeamId: 'team_a',
      eventIds: ['event_scout_1'],
    });
  });

  it('applies a manual score adjustment without changing rally, serve, or rotation', () => {
    const initial = createInitialMatchState(metadata);
    const adjusted = reduceMatch(initial, {
      type: 'score_adjustment',
      id: 'adjustment_1',
      matchId: metadata.id,
      setNumber: 1,
      teamId: metadata.teamBId,
      delta: 1,
      sequence: 1,
      timestamp: 1,
    });

    expect(adjusted.score).toEqual({ teamA: 0, teamB: 1 });
    expect(adjusted.servingTeamId).toBe(initial.servingTeamId);
    expect(adjusted.currentRally).toEqual(initial.currentRally);
    expect(adjusted.lineups).toEqual(initial.lineups);
  });

  it('alternates physical court sides when a new set starts', () => {
    const state = replayMatch(metadata, [
      {
        type: 'set_started',
        id: 'set_2',
        matchId: metadata.id,
        setNumber: 2,
        initialScore: { teamA: 0, teamB: 0 },
        servingTeamId: metadata.teamBId,
        sequence: 1,
        timestamp: 1,
      },
    ]);

    expect(state.courtOrientation).toEqual({
      leftTeamId: metadata.teamBId,
      rightTeamId: metadata.teamAId,
    });
  });

  it('is deterministic even when storage returns events out of order', () => {
    expect(replayMatch(metadata, [...events].reverse())).toEqual(replayMatch(metadata, events));
  });

  it('does not mutate the previous state and ignores duplicate event ids', () => {
    const initial = createInitialMatchState(metadata);
    const next = reduceMatch(initial, events[0]);
    const duplicate = reduceMatch(next, events[0]);

    expect(initial.lastSequence).toBe(0);
    expect(initial.currentRally.status).toBe('idle');
    expect(next).not.toBe(initial);
    expect(duplicate).toBe(next);
  });

  it('applies an infraction as a terminal point and fully reverses it through undo', () => {
    const fault: MatchEvent = {
      type: 'fault',
      id: 'fault_1',
      matchId: metadata.id,
      sequence: 2,
      timestamp: 2,
      faultType: 'net_touch',
      teamId: metadata.teamAId,
      athleteId: 'team_a_08',
      rallyId: 'fault_rally',
      terminal: true,
      pointFor: metadata.teamBId,
      previousServingTeamId: metadata.teamAId,
    };
    const started: MatchEvent = {
      type: 'rally_started',
      id: 'fault_start',
      matchId: metadata.id,
      rallyId: 'fault_rally',
      sequence: 1,
      timestamp: 1,
      sourceHistoryEventId: fault.id,
    };
    const undo: MatchEvent = {
      type: 'scout_undone',
      id: 'fault_undo',
      matchId: metadata.id,
      targetHistoryEventId: fault.id,
      sequence: 3,
      timestamp: 3,
    };

    const state = replayMatch(metadata, [started, fault]);
    expect(state).toMatchObject({
      score: { teamA: 0, teamB: 1 },
      servingTeamId: metadata.teamBId,
      currentRally: { status: 'ended', winningTeamId: metadata.teamBId },
    });
    expect(replayMatch(metadata, [started, fault, undo])).toMatchObject({
      score: { teamA: 0, teamB: 0 },
      servingTeamId: metadata.teamAId,
      currentRally: { status: 'idle' },
    });
  });

  it('tolerates simplified scout without an explicit rally-start event', () => {
    const state = replayMatch(metadata, [{ type: 'scout_registered', event: scout }]);

    expect(state.currentRally).toMatchObject({
      rallyId: 'rally_1',
      status: 'active',
      phase: 'serve',
    });
  });

  it('scores automatically and rotates only the receiving team that wins the serve', () => {
    const teamBLineup: SetLineup = {
      teamId: 'team_b',
      setNumber: 1,
      positions: { 1: 'b1', 2: 'b2', 3: 'b3', 4: 'b4', 5: 'b5', 6: 'b6' },
      slots: Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((position) => [
          `b${position}`,
          {
            slotId: `b${position}`,
            tacticalRole: position === 1 ? 'setter' : 'custom',
            playerId: `player_b${position}`,
          },
        ]),
      ),
    };
    const automaticEvents: MatchEvent[] = [
      {
        type: 'set_lineup_confirmed',
        id: 'lineup',
        matchId: 'match_1',
        lineup: teamBLineup,
        sequence: 1,
        timestamp: 1,
      },
      {
        type: 'rally_result',
        id: 'result_1',
        matchId: 'match_1',
        rallyId: 'r1',
        winnerTeamId: 'team_a',
        previousServingTeamId: 'team_a',
        sequence: 2,
        timestamp: 2,
      },
      {
        type: 'rally_result',
        id: 'result_2',
        matchId: 'match_1',
        rallyId: 'r2',
        winnerTeamId: 'team_b',
        previousServingTeamId: 'team_a',
        sequence: 3,
        timestamp: 3,
      },
      {
        type: 'rally_result',
        id: 'result_3',
        matchId: 'match_1',
        rallyId: 'r3',
        winnerTeamId: 'team_b',
        previousServingTeamId: 'team_b',
        sequence: 4,
        timestamp: 4,
      },
    ];

    const state = replayMatch(metadata, automaticEvents);

    expect(state.score).toEqual({ teamA: 1, teamB: 2 });
    expect(state.servingTeamId).toBe('team_b');
    const lineup = state.lineups[0];
    expect(lineup?.positions).toEqual({ 1: 'b2', 2: 'b3', 3: 'b4', 4: 'b5', 5: 'b6', 6: 'b1' });
  });

  it('changes a slot occupant without changing its role or rotation position', () => {
    const lineup = {
      teamId: 'team_a',
      setNumber: 1,
      positions: { 1: 'slot', 2: 's2', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
      slots: {
        slot: { slotId: 'slot', tacticalRole: 'opposite', playerId: 'player_14' },
        s2: { slotId: 's2', tacticalRole: 'custom', playerId: 'p2' },
        s3: { slotId: 's3', tacticalRole: 'custom', playerId: 'p3' },
        s4: { slotId: 's4', tacticalRole: 'custom', playerId: 'p4' },
        s5: { slotId: 's5', tacticalRole: 'custom', playerId: 'p5' },
        s6: { slotId: 's6', tacticalRole: 'custom', playerId: 'p6' },
      },
    } as const;
    const state = replayMatch(metadata, [
      {
        type: 'set_lineup_confirmed',
        id: 'lineup_a',
        matchId: 'match_1',
        lineup,
        sequence: 1,
        timestamp: 1,
      },
      {
        type: 'substitution_made',
        id: 'sub',
        matchId: 'match_1',
        teamId: 'team_a',
        setNumber: 1,
        slotId: 'slot',
        playerOutId: 'player_14',
        playerInId: 'player_7',
        rotationPositionAtSubstitution: 1,
        score: { teamA: 0, teamB: 0 },
        playerOutRole: 'opposite',
        playerInRole: 'opposite',
        sequence: 2,
        timestamp: 2,
      },
    ]);

    expect(state.lineups[0]?.slots.slot).toEqual({
      slotId: 'slot',
      tacticalRole: 'opposite',
      playerId: 'player_7',
      activeRole: 'opposite',
    });
    expect(state.lineups[0]?.positions[1]).toBe('slot');
  });

  it('allows the same athlete to occupy a different tactical slot in another set', () => {
    const lineupFor = (setNumber: number, tacticalRole: 'opposite' | 'outside_1') =>
      ({
        teamId: 'team_a',
        setNumber,
        positions: {
          1: `main_${setNumber}`,
          2: `s2_${setNumber}`,
          3: `s3_${setNumber}`,
          4: `s4_${setNumber}`,
          5: `s5_${setNumber}`,
          6: `s6_${setNumber}`,
        },
        slots: {
          [`main_${setNumber}`]: {
            slotId: `main_${setNumber}`,
            tacticalRole,
            playerId: 'player_14',
          },
          [`s2_${setNumber}`]: {
            slotId: `s2_${setNumber}`,
            tacticalRole: 'custom' as const,
            playerId: `p2_${setNumber}`,
          },
          [`s3_${setNumber}`]: {
            slotId: `s3_${setNumber}`,
            tacticalRole: 'custom' as const,
            playerId: `p3_${setNumber}`,
          },
          [`s4_${setNumber}`]: {
            slotId: `s4_${setNumber}`,
            tacticalRole: 'custom' as const,
            playerId: `p4_${setNumber}`,
          },
          [`s5_${setNumber}`]: {
            slotId: `s5_${setNumber}`,
            tacticalRole: 'custom' as const,
            playerId: `p5_${setNumber}`,
          },
          [`s6_${setNumber}`]: {
            slotId: `s6_${setNumber}`,
            tacticalRole: 'custom' as const,
            playerId: `p6_${setNumber}`,
          },
        },
      }) satisfies SetLineup;
    const state = replayMatch(metadata, [
      {
        type: 'set_lineup_confirmed',
        id: 'l1',
        matchId: 'match_1',
        lineup: lineupFor(1, 'opposite'),
        sequence: 1,
        timestamp: 1,
      },
      {
        type: 'set_started',
        id: 'set2',
        matchId: 'match_1',
        setNumber: 2,
        initialScore: { teamA: 0, teamB: 0 },
        sequence: 2,
        timestamp: 2,
      },
      {
        type: 'set_lineup_confirmed',
        id: 'l2',
        matchId: 'match_1',
        lineup: lineupFor(2, 'outside_1'),
        sequence: 3,
        timestamp: 3,
      },
    ]);

    expect(state.lineups.find((lineup) => lineup.setNumber === 1)?.slots.main_1.tacticalRole).toBe(
      'opposite',
    );
    expect(state.lineups.find((lineup) => lineup.setNumber === 2)?.slots.main_2.tacticalRole).toBe(
      'outside_1',
    );
  });
});
