import { describe, expect, it } from 'vitest';
import type { SetLineup } from '../lineup/SetLineup';
import { ActiveSetterResolver } from './ActiveSetterResolver';

const lineup: SetLineup = {
  teamId: 'team_a',
  setNumber: 1,
  positions: { 1: 'opposite', 2: 'setter', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
  slots: {
    setter: {
      slotId: 'setter',
      tacticalRole: 'setter',
      playerId: 'setter_1',
      activeRole: 'setter',
    },
    opposite: {
      slotId: 'opposite',
      tacticalRole: 'opposite',
      playerId: 'opposite_1',
      activeRole: 'opposite',
    },
    s3: { slotId: 's3', tacticalRole: 'custom', playerId: 'p3', activeRole: 'custom' },
    s4: { slotId: 's4', tacticalRole: 'custom', playerId: 'p4', activeRole: 'custom' },
    s5: { slotId: 's5', tacticalRole: 'custom', playerId: 'p5', activeRole: 'custom' },
    s6: { slotId: 's6', tacticalRole: 'custom', playerId: 'p6', activeRole: 'custom' },
  },
};

describe('ActiveSetterResolver', () => {
  it('resolves the athlete actively setting independently from the original slot role', () => {
    const inverted: SetLineup = {
      ...lineup,
      slots: {
        ...lineup.slots,
        setter: { ...lineup.slots.setter, playerId: 'attacker_2', activeRole: 'opposite' },
        opposite: { ...lineup.slots.opposite, playerId: 'setter_2', activeRole: 'setter' },
      },
    };

    expect(new ActiveSetterResolver().resolve(inverted)).toEqual({
      playerId: 'setter_2',
      slotId: 'opposite',
      position: 1,
    });
  });

  it('returns undefined when two active setters make the state ambiguous', () => {
    const ambiguous: SetLineup = {
      ...lineup,
      slots: {
        ...lineup.slots,
        opposite: { ...lineup.slots.opposite, activeRole: 'setter' },
      },
    };
    expect(new ActiveSetterResolver().resolve(ambiguous)).toBeUndefined();
  });
});
