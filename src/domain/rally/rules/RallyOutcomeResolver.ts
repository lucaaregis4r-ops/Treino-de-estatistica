import type { Team } from '../../match/entities/Team';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';

export interface RallyOutcome {
  readonly winnerTeamId: string;
  readonly reason: string;
}

export class RallyOutcomeResolver {
  resolve(event: ScoutEvent, teams: readonly [Team, Team]): RallyOutcome | undefined {
    const opponent = teams.find((team) => team.id !== event.teamId);
    if (!opponent) return undefined;
    if (event.outcome === 'ace') return { winnerTeamId: event.teamId, reason: 'serve_ace' };
    if (event.outcome === 'point' && ['attack', 'block'].includes(event.skill)) {
      return { winnerTeamId: event.teamId, reason: `${event.skill}_point` };
    }
    if (event.outcome === 'error' && ['serve', 'attack'].includes(event.skill)) {
      return { winnerTeamId: opponent.id, reason: `${event.skill}_error` };
    }
    return undefined;
  }
}
