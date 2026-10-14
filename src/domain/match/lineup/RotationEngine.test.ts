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

  it('restores the original player if a slot occupied by the libero rotates to the front row (P4, P3, P2)', () => {
    // Middle 2 in slot 5 had libero as occupant
    const lineupWithLiberoInBackRow: SetLineup = {
      ...lineupFixture,
      slots: {
        ...lineupFixture.slots,
        middle_2: {
          slotId: 'middle_2',
          tacticalRole: 'middle_2',
          playerId: 'libero_99',
          originalPlayerId: 'player_4',
          activeRole: 'libero',
        },
      },
    };

    // When middle_2 moves from P6 (or P5) to P4 (front row):
    // Let's set middle_2 in position 5 so ROTATED_FROM[4] = 5 will move it to position 4
    const lineupAtPos5: SetLineup = {
      ...lineupWithLiberoInBackRow,
      positions: {
        ...lineupFixture.positions,
        5: 'middle_2',
        4: 'outside_2',
      },
    };

    const rotated = new RotationEngine().rotate(lineupAtPos5, ['libero_99']);
    // middle_2 is now at position 4 (front row / rede)
    expect(rotated.positions[4]).toBe('middle_2');
    // player at middle_2 must be restored to player_4 (central original), NEVER libero_99
    expect(rotated.slots.middle_2.playerId).toBe('player_4');
    expect(rotated.slots.middle_2.activeRole).toBe('middle');
  });
});
