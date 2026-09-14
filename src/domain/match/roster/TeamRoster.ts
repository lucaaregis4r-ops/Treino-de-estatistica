import type { Player } from '../entities/Player';

export interface TeamRoster {
  readonly teamId: string;
  readonly players: readonly Player[];
  readonly liberoPlayerIds?: readonly string[];
}

export class RosterPlayerResolver {
  resolve(roster: TeamRoster, jerseyNumber: number): Player | undefined {
    return roster.players.find(
      (player) =>
        player.teamId === roster.teamId &&
        player.number === jerseyNumber &&
        player.active !== false,
    );
  }
}
