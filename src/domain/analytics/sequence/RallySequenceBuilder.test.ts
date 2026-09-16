import { describe, expect, it } from 'vitest';
import { defaultTacticalInput } from '../../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { buildRallySequences } from './RallySequenceBuilder';

function event(
  id: string,
  rallyId: string,
  sequence: number,
  skill: ScoutEvent['skill'],
  overrides: Partial<ScoutEvent> = {},
): ScoutEvent {
  return {
    id,
    matchId: 'match',
    rallyId,
    sequence,
    teamId: 'team_a',
    skill,
    outcome: 'continuation',
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: id,
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    ...overrides,
  };
}

const options = { zoneSystem: defaultTacticalInput.zoneSystem };

describe('RallySequenceBuilder', () => {
  it('groups rallies independently and orders events by sequence', () => {
    const sequences = buildRallySequences(
      [
        event('r2-attack', 'rally-2', 2, 'attack'),
        event('r1-attack', 'rally-1', 2, 'attack'),
        event('r1-serve', 'rally-1', 1, 'serve'),
        event('r2-serve', 'rally-2', 1, 'serve'),
      ],
      { ...options, winnerByRallyId: new Map([['rally-1', 'team_a']]) },
    );

    expect(sequences).toHaveLength(2);
    expect(sequences[0].rallyId).toBe('rally-2');
    expect(sequences[0].observations.map((item) => item.stateId)).toEqual(['serve', 'attack']);
    expect(sequences[0].status).toBe('incomplete');
    expect(sequences[1].states).toEqual(['serve', 'attack', 'terminal_win']);
  });

  it('keeps a complete rally terminal tied to the real winner and maps set/dig to other/defense', () => {
    const sequence = buildRallySequences(
      [
        event('serve', 'rally', 1, 'serve'),
        event('set', 'rally', 2, 'set'),
        event('dig', 'rally', 3, 'dig', { playerId: undefined }),
        event('block', 'rally', 4, 'block'),
      ],
      { ...options, winnerByRallyId: new Map([['rally', 'team_b']]) },
    )[0];

    expect(sequence.states).toEqual(['serve', 'other', 'defense', 'block', 'terminal_loss']);
    expect(sequence.terminal).toMatchObject({ winnerTeamId: 'team_b', referenceTeamId: 'team_a' });
    expect(sequence.observations[2].event.playerId).toBeUndefined();
  });

  it('preserves coordinates and derives deterministic regions at a zone boundary', () => {
    const sequence = buildRallySequences(
      [
        event('attack', 'rally', 1, 'attack', {
          metadata: {
            spatial: {
              origin: { surface: 'court', x: 1 / 3, y: 1 / 4 },
              destination: { surface: 'court', x: 5 / 6, y: 3 / 4 },
            },
          },
        }),
      ],
      { ...options, winnerByRallyId: new Map([['rally', 'team_a']]) },
    )[0];

    expect(sequence.observations[0].spatial).toEqual({
      origin: { surface: 'court', x: 1 / 3, y: 1 / 4 },
      target: { surface: 'court', x: 5 / 6, y: 3 / 4 },
      originRegionId: '4',
      targetRegionId: '1',
      coordinateSystemVersion: '2.0.0',
    });
    expect(sequence.states).not.toContain('attack_0.333_0.25' as never);
  });

  it('keeps an event without coordinates valid and does not invent zero coordinates', () => {
    const sequence = buildRallySequences(
      [
        event('reception', 'rally', 1, 'reception', {
          metadata: { coverage: { mode: 'team_a', observedTeamIds: ['team_a'] } },
        }),
      ],
      options,
    )[0];

    expect(sequence.status).toBe('incomplete');
    expect(sequence.observations[0].spatial).toEqual({ coordinateSystemVersion: '2.0.0' });
    expect(sequence.observations[0].event.metadata?.coverage?.mode).toBe('team_a');
    expect(JSON.stringify(sequence)).not.toContain('0,0');
  });
});
