import { describe, expect, it } from 'vitest';
import { GestureExpectedActionResolver } from './GestureExpectedActionResolver';
import type { Skill } from '../../scout/entities/Skill';

describe('GestureExpectedActionResolver', () => {
  const resolver = new GestureExpectedActionResolver();

  it.each([
    ['serve', 'serve'],
    ['reception', 'reception'],
    ['set', 'attack'],
    ['attack', 'attack'],
    ['block', 'dig'],
    ['dig', 'dig'],
    ['free_ball', 'free_ball'],
  ] as const)('maps canonical %s to gesture %s', (canonical, gesture) => {
    expect(
      resolver.resolve({ skill: canonical as Skill, teamId: 'team-a', reason: 'rally_start' }),
    ).toEqual({ skill: gesture, teamId: 'team-a' });
  });

  it('keeps the correct team through the reduced rally sequence', () => {
    const canonical = [
      { skill: 'serve', teamId: 'A', reason: 'rally_start' },
      { skill: 'reception', teamId: 'B', reason: 'serve_received' },
      { skill: 'set', teamId: 'B', reason: 'reception_completed' },
      { skill: 'block', teamId: 'A', reason: 'attack_defense' },
      { skill: 'set', teamId: 'A', reason: 'defense_completed' },
      { skill: 'block', teamId: 'B', reason: 'attack_defense' },
    ] as const;
    expect(canonical.map((expected) => resolver.resolve(expected))).toEqual([
      { skill: 'serve', teamId: 'A' },
      { skill: 'reception', teamId: 'B' },
      { skill: 'attack', teamId: 'B' },
      { skill: 'dig', teamId: 'A' },
      { skill: 'attack', teamId: 'A' },
      { skill: 'dig', teamId: 'B' },
    ]);
  });

  it('preserves transferred possession after free ball and clears terminal expectation', () => {
    expect(
      resolver.resolve({ skill: 'reception', teamId: 'B', reason: 'free_ball_sent' }),
    ).toEqual({ skill: 'dig', teamId: 'B' });
    expect(resolver.resolve(undefined)).toBeUndefined();
  });
});
