import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../entities/MatchMetadata';
import { createInitialMatchState } from '../state/MatchState';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { MatchEventFactory } from './MatchEventFactory';

const metadata: MatchMetadata = {
  id: 'match',
  name: 'A x B',
  teamAId: 'a',
  teamBId: 'b',
  createdAt: 1,
  status: 'in_progress',
  initialServingTeamId: 'a',
  scoringRules: {
    regularSetTarget: 2,
    decidingSetTarget: 2,
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

function factory() {
  let id = 0;
  let now = 100;
  return new MatchEventFactory({
    createId: () => `id_${++id}`,
    now: () => ++now,
  });
}

function scout(overrides: Partial<ScoutEvent> = {}): ScoutEvent {
  return {
    id: 'scout',
    matchId: 'match',
    rallyId: 'rally',
    sequence: 2,
    timestamp: 2,
    teamId: 'a',
    skill: 'attack',
    outcome: 'point',
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    rawCode: '01A#',
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'basic',
    ...overrides,
  };
}

describe('MatchEventFactory', () => {
  it('creates linked rally and set events with contiguous sequences', () => {
    const events = factory().derivedFromScout({
      state: { ...createInitialMatchState(metadata), score: { teamA: 1, teamB: 0 } },
      teams,
      scout: scout(),
      sourceHistoryEventId: 'scout',
      firstSequence: 3,
    });

    expect(events.map((event) => [event.type, 'sequence' in event ? event.sequence : 0])).toEqual([
      ['rally_result', 3],
      ['set_finished', 4],
    ]);
    expect(events[0]).toMatchObject({
      targetScoutEventId: 'scout',
      sourceHistoryEventId: 'scout',
    });
    expect(events[1]).toMatchObject({ finalScore: { teamA: 2, teamB: 0 } });
  });

  it('creates a manual point correction without duplicate sequences', () => {
    const events = factory().pointCorrection({
      state: createInitialMatchState(metadata),
      teams,
      teamId: 'b',
      rallyId: 'manual_rally',
      firstSequence: 7,
      startsRally: true,
    });

    expect(events.map((event) => event.type)).toEqual(['rally_started', 'match_correction']);
    expect(events.map((event) => ('sequence' in event ? event.sequence : 0))).toEqual([7, 8]);
    expect(new Set(events.map((event) => ('sequence' in event ? event.sequence : 0))).size).toBe(
      events.length,
    );
  });

  it('ignores non-terminal scout contacts', () => {
    expect(
      factory().derivedFromScout({
        state: createInitialMatchState(metadata),
        teams,
        scout: scout({ skill: 'reception', outcome: 'perfect' }),
        sourceHistoryEventId: 'scout',
        firstSequence: 3,
      }),
    ).toEqual([]);
  });
});
