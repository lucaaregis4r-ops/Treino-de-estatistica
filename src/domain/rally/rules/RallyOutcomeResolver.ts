import type { Team } from '../../match/entities/Team';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { tacticalValue } from '../../scout/tactical/TacticalMetadataAdapter';

export interface RallyOutcome {
  readonly winnerTeamId: string;
  readonly reason: string;
}

export class RallyOutcomeResolver {
  resolve(event: ScoutEvent, teams: readonly [Team, Team]): RallyOutcome | undefined {
    const opponent = teams.find((team) => team.id !== event.teamId);
    if (!opponent) return undefined;

    // Terminal meaning is intentionally resolved by skill + evaluation. The
    // same symbol can continue a rally for one skill and end it for another.
    const isError = event.outcome === 'error' || event.evaluation === 'error';
    if (event.skill === 'serve') {
      if (isError) return { winnerTeamId: opponent.id, reason: 'serve_error' };
      if (event.outcome === 'ace' || event.evaluation === 'excellent') {
        return { winnerTeamId: event.teamId, reason: 'serve_ace' };
      }
      return undefined;
    }

    if (event.skill === 'attack' || event.skill === 'block') {
      if (event.skill === 'attack') {
        const blockOutcome = tacticalValue.blockOutcome(event.metadata);
        if (blockOutcome === 'point') {
          return { winnerTeamId: opponent.id, reason: 'attack_blocked' };
        }
        if (blockOutcome === 'tool') {
          return { winnerTeamId: event.teamId, reason: 'attack_tool' };
        }
        if (blockOutcome === 'soft_touch') return undefined;
      }
      if (isError) return { winnerTeamId: opponent.id, reason: `${event.skill}_error` };
      if (event.outcome === 'point' || event.evaluation === 'excellent') {
        return { winnerTeamId: event.teamId, reason: `${event.skill}_point` };
      }
      return undefined;
    }

    if (isError) return { winnerTeamId: opponent.id, reason: `${event.skill}_error` };
    return undefined;
  }
}
