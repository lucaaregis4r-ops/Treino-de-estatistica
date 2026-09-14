import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { MatchEvent } from './MatchEvent';
import {
  findRedoTarget,
  findUndoTarget,
  projectEffectiveMatchEvents,
  projectScoutTimeline,
} from './ScoutTimeline';

const original: ScoutEvent = {
  id: 'scout_1',
  matchId: 'match_1',
  rallyId: 'rally_1',
  sequence: 1,
  teamId: 'team_a',
  skill: 'attack',
  outcome: 'point',
  evaluation: 'excellent',
  setNumber: 1,
  scoreBefore: { teamA: 0, teamB: 0 },
  timestamp: 1,
  rawCode: '08A#',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};
const replacement: ScoutEvent = {
  ...original,
  id: 'replacement_1',
  sequence: 2,
  outcome: 'positive',
  evaluation: 'positive',
  rawCode: '08A+',
};

describe('ScoutTimeline', () => {
  it('projects correction, undo, and redo while retaining the full log', () => {
    const registered: MatchEvent = { type: 'scout_registered', event: original };
    const corrected: MatchEvent = {
      type: 'scout_corrected',
      id: 'correction_1',
      matchId: 'match_1',
      sequence: 2,
      timestamp: 2,
      targetEventId: original.id,
      previousRawCode: original.rawCode,
      newRawCode: replacement.rawCode,
      replacementEvent: replacement,
    };
    const undone: MatchEvent = {
      type: 'scout_undone',
      id: 'undo_1',
      matchId: 'match_1',
      sequence: 3,
      timestamp: 3,
      targetHistoryEventId: 'correction_1',
    };
    const redone: MatchEvent = {
      type: 'scout_redone',
      id: 'redo_1',
      matchId: 'match_1',
      sequence: 4,
      timestamp: 4,
      targetUndoEventId: 'undo_1',
    };

    expect(projectScoutTimeline([registered, corrected])[0]?.event.rawCode).toBe('08A+');
    expect(findUndoTarget([registered, corrected])).toBe('correction_1');
    expect(projectScoutTimeline([registered, corrected, undone])[0]?.event.rawCode).toBe('08A#');
    expect(findRedoTarget([registered, corrected, undone])).toBe('undo_1');
    expect(projectScoutTimeline([registered, corrected, undone, redone])[0]?.event.rawCode).toBe(
      '08A+',
    );
    expect([registered, corrected, undone, redone]).toHaveLength(4);
  });

  it('keeps a linked rally start through correction and removes it with the registration', () => {
    const registered: MatchEvent = { type: 'scout_registered', event: original };
    const started: MatchEvent = {
      type: 'rally_started',
      id: 'start_1',
      matchId: 'match_1',
      rallyId: 'rally_1',
      targetScoutEventId: original.id,
      sourceHistoryEventId: original.id,
      sequence: 0,
      timestamp: 0,
    };
    const corrected: MatchEvent = {
      type: 'scout_corrected',
      id: 'correction_1',
      matchId: 'match_1',
      sequence: 2,
      timestamp: 2,
      targetEventId: original.id,
      previousRawCode: original.rawCode,
      newRawCode: replacement.rawCode,
      replacementEvent: replacement,
    };
    const undoRegistration: MatchEvent = {
      type: 'scout_undone',
      id: 'undo_registration',
      matchId: 'match_1',
      sequence: 3,
      timestamp: 3,
      targetHistoryEventId: original.id,
    };

    expect(projectEffectiveMatchEvents([started, registered, corrected])).toContainEqual(started);
    expect(projectEffectiveMatchEvents([started, registered, undoRegistration])).not.toContainEqual(
      started,
    );
  });
});
