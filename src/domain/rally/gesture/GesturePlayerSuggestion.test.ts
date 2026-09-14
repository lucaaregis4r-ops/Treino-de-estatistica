import { describe, expect, it } from 'vitest';
import { GesturePlayerSuggestionResolver } from './GesturePlayerSuggestion';
import type { SetLineup } from '../../match/lineup/SetLineup';

const lineup: SetLineup = {
  teamId: 'team-a',
  setNumber: 1,
  positions: { 1: 's1', 2: 's2', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
  slots: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((position) => [
      `s${position}`,
      { slotId: `s${position}`, tacticalRole: 'custom' as const, playerId: `p${position}` },
    ]),
  ),
};

describe('GesturePlayerSuggestionResolver', () => {
  const resolver = new GesturePlayerSuggestionResolver();

  it('suggests P1 automatically for serve', () => {
    expect(resolver.resolve(lineup, 'serve')).toEqual({
      automatic: 'p1',
      highlighted: ['p1'],
      others: ['p2', 'p3', 'p4', 'p5', 'p6'],
    });
  });

  it('prioritizes back-row passers while keeping everyone selectable', () => {
    const suggestion = resolver.resolve(lineup, 'reception');
    expect(suggestion.highlighted).toEqual(['p5', 'p6', 'p1']);
    expect(suggestion.others).toEqual(['p2', 'p3', 'p4']);
  });

  it('prioritizes front-row attackers and leaves back-row options available', () => {
    const suggestion = resolver.resolve(lineup, 'attack');
    expect(suggestion.highlighted).toEqual(['p4', 'p3', 'p2']);
    expect(suggestion.others).toEqual(['p1', 'p5', 'p6']);
  });

  it('returns no automatic player when there is no lineup', () => {
    expect(resolver.resolve(undefined, 'serve')).toEqual({ highlighted: [], others: [] });
  });

  it('uses the current rotation positions rather than tactical roles', () => {
    const rotated: SetLineup = {
      ...lineup,
      positions: { 1: 's4', 2: 's5', 3: 's6', 4: 's1', 5: 's2', 6: 's3' },
    };
    expect(resolver.resolve(rotated, 'serve').automatic).toBe('p4');
    expect(resolver.resolve(rotated, 'reception').highlighted).toEqual(['p2', 'p3', 'p4']);
    expect(resolver.resolve(rotated, 'attack').highlighted).toEqual(['p1', 'p6', 'p5']);
  });
});
