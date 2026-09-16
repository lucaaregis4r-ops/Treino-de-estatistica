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

  it('keeps neutral-quality contacts in the rally and ends errors for every technical action', () => {
    const resolver = new RallyOutcomeResolver();
    for (const skill of ['reception', 'set', 'dig', 'free_ball'] as const) {
      expect(resolver.resolve({ ...base, skill, outcome: 'excellent', evaluation: 'excellent' }, teams)).toBeUndefined();
      expect(resolver.resolve({ ...base, skill, outcome: 'error', evaluation: 'error' }, teams)).toMatchObject({
        winnerTeamId: 'b',
        reason: `${skill}_error`,
      });
    }
  });

  it('resolves attack block outcomes without turning a block point into an attack error', () => {
    const resolver = new RallyOutcomeResolver();
    const metadata = (outcome: 'point' | 'tool' | 'soft_touch') => ({
      tactical: { attack: { block: { outcome } } },
    });
    expect(resolver.resolve({ ...base, outcome: 'blocked', evaluation: 'error', metadata: metadata('point') }, teams)).toEqual({
      winnerTeamId: 'b',
      reason: 'attack_blocked',
    });
    expect(resolver.resolve({ ...base, outcome: 'point', metadata: metadata('tool') }, teams)).toEqual({
      winnerTeamId: 'a',
      reason: 'attack_tool',
    });
    expect(resolver.resolve({ ...base, outcome: 'continuation', metadata: metadata('soft_touch') }, teams)).toBeUndefined();
  });
});
