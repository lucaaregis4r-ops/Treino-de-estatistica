import { describe, expect, it } from 'vitest';
import { RosterPlayerResolver } from './TeamRoster';

describe('RosterPlayerResolver', () => {
  it('resolves an active athlete by jersey without assigning a permanent tactical role', () => {
    const player = { id: 'player_8', teamId: 'team', number: 8, name: 'Ana', active: true };
    const resolver = new RosterPlayerResolver();

    expect(resolver.resolve({ teamId: 'team', players: [player] }, 8)).toEqual(player);
    expect(resolver.resolve({ teamId: 'team', players: [player] }, 9)).toBeUndefined();
    expect('role' in player).toBe(false);
  });

  it('does not resolve the same jersey number from the opposing team', () => {
    const resolver = new RosterPlayerResolver();
    const home = { id: 'home_8', teamId: 'home', number: 8, active: true };
    const away = { id: 'away_8', teamId: 'away', number: 8, active: true };

    expect(resolver.resolve({ teamId: 'home', players: [away, home] }, 8)).toEqual(home);
    expect(resolver.resolve({ teamId: '', players: [away, home] }, 8)).toBeUndefined();
  });
});
