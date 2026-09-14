import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { RallyOutcomeResolver } from './RallyOutcomeResolver';

const base: ScoutEvent = {
  id: 'event',
  matchId: 'match',
  rallyId: 'rally',
  sequence: 1,
  timestamp: 1,
  teamId: 'a',
  playerId: 'player',
  skill: 'attack',
  outcome: 'point',
  evaluation: 'excellent',
  setNumber: 1,
  scoreBefore: { teamA: 0, teamB: 0 },
  rawCode: '08A#',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};
const teams = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
] as const;

describe('RallyOutcomeResolver', () => {
  it('resolves terminal winners and ignores non-terminal contacts', () => {
    const resolver = new RallyOutcomeResolver();
    expect(resolver.resolve(base, teams)?.winnerTeamId).toBe('a');
    expect(
      resolver.resolve({ ...base, skill: 'serve', outcome: 'error' }, teams)?.winnerTeamId,
    ).toBe('b');
    expect(
      resolver.resolve({ ...base, skill: 'reception', outcome: 'perfect' }, teams),
    ).toBeUndefined();
    expect(resolver.resolve({ ...base, skill: 'reception', outcome: 'error' }, teams)).toEqual({
      winnerTeamId: 'b',
      reason: 'reception_error',
    });
    expect(resolver.resolve({ ...base, skill: 'block', outcome: 'error' }, teams)).toEqual({
      winnerTeamId: 'b',
      reason: 'block_error',
    });
  });

  it('keeps an ace with the serving team and awards a serve error to the opponent', () => {
    const resolver = new RallyOutcomeResolver();
    expect(resolver.resolve({ ...base, skill: 'serve', outcome: 'ace' }, teams)).toEqual({
      winnerTeamId: 'a',
      reason: 'serve_ace',
    });
    expect(resolver.resolve({ ...base, skill: 'serve', outcome: 'error' }, teams)).toEqual({
      winnerTeamId: 'b',
      reason: 'serve_error',
    });
  });
});
