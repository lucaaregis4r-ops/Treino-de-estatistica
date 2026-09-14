import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../entities/MatchMetadata';
import { MatchEventFactory } from '../events/MatchEventFactory';
import { findRedoTarget, findUndoTarget } from '../events/ScoutTimeline';
import type { MatchEvent } from '../events/MatchEvent';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { createInitialMatchState } from '../state/MatchState';
import { MatchReplayService } from './MatchReplayService';

const metadata: MatchMetadata = {
  id: 'match',
  name: 'A x B',
  teamAId: 'a',
  teamBId: 'b',
  createdAt: 1,
  status: 'in_progress',
  initialServingTeamId: 'a',
  scoringRules: {
    regularSetTarget: 1,
    decidingSetTarget: 1,
    minimumLead: 1,
    setsToWin: 1,
  },
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};
const teams = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
] as const;

describe('MatchReplayService', () => {
  it('undoes and redoes a point correction by replaying the event history', () => {
    let id = 0;
    const factory = new MatchEventFactory({
      createId: () => `event_${++id}`,
      now: () => id,
    });
    const replay = new MatchReplayService();
    const correctionEvents = factory.pointCorrection({
      state: createInitialMatchState(metadata),
      teams,
      teamId: 'b',
      rallyId: 'rally',
      firstSequence: 1,
      startsRally: true,
    });
    const correctionId = findUndoTarget(correctionEvents);
    if (!correctionId) throw new Error('Correction target was not created.');
    const undo = factory.undo('match', correctionId, 4);
    const redoTarget = findRedoTarget([...correctionEvents, undo]);
    if (!redoTarget) throw new Error('Redo target was not created.');
    const redo = factory.redo('match', redoTarget, 5);

    const applied = replay.replay(metadata, correctionEvents);
    const undone = replay.replay(metadata, [...correctionEvents, undo]);
    const redone = replay.replay(metadata, [...correctionEvents, undo, redo]);

    expect(applied).toMatchObject({
      score: { teamA: 0, teamB: 1 },
      servingTeamId: 'b',
      matchCompleted: true,
    });
    expect(undone).toMatchObject({
      score: { teamA: 0, teamB: 0 },
      servingTeamId: 'a',
      matchCompleted: false,
      currentRally: { status: 'idle' },
    });
    expect(redone.score).toEqual(applied.score);
    expect(redone.servingTeamId).toBe(applied.servingTeamId);
    expect(redone.sets).toEqual(applied.sets);
    expect(redone.currentRally).toEqual(applied.currentRally);
  });

  it('undoes an independent score adjustment without changing serving or rally state', () => {
    const factory = new MatchEventFactory({ createId: () => crypto.randomUUID(), now: () => 1 });
    const adjustment = factory.scoreAdjustment({
      matchId: metadata.id,
      setNumber: 1,
      teamId: 'b',
      delta: 1,
      sequence: 1,
    });
    const undo = factory.undo(metadata.id, adjustment.id, 2);
    const replay = new MatchReplayService();

    const adjusted = replay.replay(metadata, [adjustment]);
    const undone = replay.replay(metadata, [adjustment, undo]);

    expect(adjusted.score).toEqual({ teamA: 0, teamB: 1 });
    expect(adjusted.servingTeamId).toBe(metadata.initialServingTeamId);
    expect(adjusted.currentRally).toEqual(undone.currentRally);
    expect(undone.score).toEqual({ teamA: 0, teamB: 0 });
  });

  it('produces the same state for the same log regardless of storage order', () => {
    const factory = new MatchEventFactory({ createId: () => crypto.randomUUID(), now: () => 1 });
    const events = factory.pointCorrection({
      state: createInitialMatchState(metadata),
      teams,
      teamId: 'a',
      rallyId: 'rally',
      firstSequence: 1,
      startsRally: true,
    });
    const replay = new MatchReplayService();

    expect(replay.replay(metadata, [...events].reverse())).toEqual(replay.replay(metadata, events));
  });

  it('applies a retroactive result at the original scout position', () => {
    const firstScout: ScoutEvent = {
      id: 'scout_1',
      matchId: 'match',
      rallyId: 'rally_1',
      sequence: 2,
      timestamp: 2,
      teamId: 'a',
      skill: 'attack',
      outcome: 'positive',
      setNumber: 1,
      scoreBefore: { teamA: 0, teamB: 0 },
      rawCode: '01A+',
      codeProfileId: 'default_compact_v1',
      codeProfileVersion: '1.0.0',
      complexityProfileId: 'basic',
    };
    const secondScout: ScoutEvent = {
      ...firstScout,
      id: 'scout_2',
      rallyId: 'rally_2',
      sequence: 4,
      outcome: 'point',
      rawCode: '01A#',
    };
    const replacement = { ...firstScout, id: 'replacement', sequence: 6, outcome: 'error' };
    const events: MatchEvent[] = [
      {
        type: 'rally_started',
        id: 'start_1',
        matchId: 'match',
        rallyId: 'rally_1',
        targetScoutEventId: 'scout_1',
        sourceHistoryEventId: 'scout_1',
        sequence: 1,
        timestamp: 1,
      },
      { type: 'scout_registered', event: firstScout },
      {
        type: 'rally_started',
        id: 'start_2',
        matchId: 'match',
        rallyId: 'rally_2',
        targetScoutEventId: 'scout_2',
        sourceHistoryEventId: 'scout_2',
        sequence: 3,
        timestamp: 3,
      },
      { type: 'scout_registered', event: secondScout },
      {
        type: 'rally_result',
        id: 'result_2',
        matchId: 'match',
        rallyId: 'rally_2',
        winnerTeamId: 'a',
        previousServingTeamId: 'a',
        targetScoutEventId: 'scout_2',
        sourceHistoryEventId: 'scout_2',
        sequence: 5,
        timestamp: 5,
      },
      {
        type: 'scout_corrected',
        id: 'correction',
        matchId: 'match',
        targetEventId: 'scout_1',
        previousRawCode: '01A+',
        newRawCode: '01A=',
        replacementEvent: replacement,
        sequence: 6,
        timestamp: 6,
      },
      {
        type: 'rally_result',
        id: 'result_1_corrected',
        matchId: 'match',
        rallyId: 'rally_1',
        winnerTeamId: 'b',
        previousServingTeamId: 'a',
        targetScoutEventId: 'scout_1',
        sourceHistoryEventId: 'correction',
        sequence: 7,
        timestamp: 7,
      },
    ];
    const replay = new MatchReplayService();

    expect(replay.stateBeforeScout(metadata, events, 'scout_1').score).toEqual({
      teamA: 0,
      teamB: 0,
    });
    expect(replay.replay(metadata, events)).toMatchObject({
      score: { teamA: 1, teamB: 1 },
      servingTeamId: 'a',
    });
  });

  it('restores the previous score and serving state when a correction is undone', () => {
    const original: ScoutEvent = {
      id: 'scout_original',
      matchId: 'match',
      rallyId: 'rally_original',
      sequence: 2,
      timestamp: 2,
      teamId: 'a',
      skill: 'attack',
      outcome: 'positive',
      setNumber: 1,
      scoreBefore: { teamA: 0, teamB: 0 },
      rawCode: '01A+',
      codeProfileId: 'default_compact_v1',
      codeProfileVersion: '1.0.0',
      complexityProfileId: 'basic',
    };
    const replacement: ScoutEvent = {
      ...original,
      id: 'scout_replacement',
      sequence: 6,
      outcome: 'point',
      rawCode: '01A#',
    };
    const correction: MatchEvent = {
      type: 'scout_corrected',
      id: 'correction_undo_target',
      matchId: 'match',
      sequence: 7,
      timestamp: 7,
      targetEventId: original.id,
      previousRawCode: original.rawCode,
      newRawCode: replacement.rawCode,
      replacementEvent: replacement,
    };
    const undo: MatchEvent = {
      type: 'scout_undone',
      id: 'undo_correction',
      matchId: 'match',
      sequence: 9,
      timestamp: 9,
      targetHistoryEventId: correction.id,
    };
    const events: MatchEvent[] = [
      {
        type: 'rally_started',
        id: 'start_original',
        matchId: 'match',
        rallyId: original.rallyId,
        targetScoutEventId: original.id,
        sourceHistoryEventId: original.id,
        sequence: 1,
        timestamp: 1,
      },
      { type: 'scout_registered', event: original },
      correction,
      {
        type: 'rally_result',
        id: 'result_corrected',
        matchId: 'match',
        rallyId: replacement.rallyId,
        winnerTeamId: 'a',
        previousServingTeamId: 'a',
        targetScoutEventId: original.id,
        sourceHistoryEventId: correction.id,
        sequence: 8,
        timestamp: 8,
      },
    ];
    const replay = new MatchReplayService();

    expect(replay.replay(metadata, events)).toMatchObject({
      score: { teamA: 1, teamB: 0 },
      servingTeamId: 'a',
    });
    expect(replay.replay(metadata, [...events, undo])).toMatchObject({
      score: { teamA: 0, teamB: 0 },
      servingTeamId: 'a',
      currentRally: { status: 'active' },
    });
  });
});
