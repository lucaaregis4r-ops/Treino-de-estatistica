import { describe, expect, it } from 'vitest';
import { RotationEngine } from './RotationEngine';
import type { SetLineup } from './SetLineup';

export const lineupFixture: SetLineup = {
  teamId: 'team_a',
  setNumber: 1,
  positions: {
    1: 'setter',
    2: 'outside_1',
    3: 'middle_1',
    4: 'opposite',
    5: 'outside_2',
    6: 'middle_2',
  },
  slots: {
    setter: { slotId: 'setter', tacticalRole: 'setter', playerId: 'player_3' },
    outside_1: { slotId: 'outside_1', tacticalRole: 'outside_1', playerId: 'player_8' },
    middle_1: { slotId: 'middle_1', tacticalRole: 'middle_1', playerId: 'player_11' },
    opposite: { slotId: 'opposite', tacticalRole: 'opposite', playerId: 'player_14' },
    outside_2: { slotId: 'outside_2', tacticalRole: 'outside_2', playerId: 'player_15' },
    middle_2: { slotId: 'middle_2', tacticalRole: 'middle_2', playerId: 'player_4' },
  },
};

describe('RotationEngine', () => {
  it('moves slots clockwise while preserving their role and occupant', () => {
    const rotated = new RotationEngine().rotate(lineupFixture);

    expect(rotated.positions).toEqual({
      1: 'outside_1',
      2: 'middle_1',
      3: 'opposite',
      4: 'outside_2',
      5: 'middle_2',
      6: 'setter',
    });
    expect(rotated.slots.opposite).toEqual(lineupFixture.slots.opposite);
    expect(lineupFixture.positions[4]).toBe('opposite');
  });
});
