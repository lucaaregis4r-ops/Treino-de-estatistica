import { describe, expect, it } from 'vitest';
import { TacticalPatternDetector } from './TacticalPatternDetector';
import type { DerivedTacticalState, SubstitutionWindow } from './TacticalState';

const inversionWindow: SubstitutionWindow = {
  teamId: 'team_a',
  setNumber: 1,
  score: { teamA: 10, teamB: 9 },
  activeSetterBeforeWindow: 'setter_1',
  formationBeforeWindow: 'normal',
  entries: [
    {
      eventId: 'sub_1',
      playerOutId: 'setter_1',
      playerInId: 'attacker_2',
      playerOutRole: 'setter',
      playerInRole: 'opposite',
    },
    {
      eventId: 'sub_2',
      playerOutId: 'opposite_1',
      playerInId: 'setter_2',
      playerOutRole: 'opposite',
      playerInRole: 'setter',
    },
  ],
};

describe('TacticalPatternDetector', () => {
  it('detects a 5x1 inversion only from the pair of ordinary substitutions', () => {
    const state: DerivedTacticalState = {
      teamId: 'team_a',
      primarySetterPlayerId: 'setter_1',
      activeSetterPlayerId: 'setter_2',
      activeSetterPosition: 1,
      formationState: 'normal',
    };
    expect(new TacticalPatternDetector().detect(inversionWindow, state)).toBe('five_one_inversion');
  });

  it('does not force a pattern from an incomplete window', () => {
    expect(
      new TacticalPatternDetector().detect(
        { ...inversionWindow, entries: inversionWindow.entries.slice(0, 1) },
        { teamId: 'team_a', formationState: 'unknown' },
      ),
    ).toBeUndefined();
  });
});
