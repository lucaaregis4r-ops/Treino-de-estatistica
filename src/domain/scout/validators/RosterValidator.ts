import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from './ScoutValidationContext';
import { type ValidationResult, validationResult } from './validation';
import { RosterPlayerResolver } from '../../match/roster/TeamRoster';

export class RosterValidator {
  private readonly resolver = new RosterPlayerResolver();
  validate(
    candidate: CanonicalScoutEventCandidate,
    context: ScoutValidationContext,
  ): ValidationResult {
    if (candidate.playerNumber === undefined) {
      return context.allowUnidentifiedPlayer
        ? validationResult([])
        : validationResult(
            [{
              code: 'player_required',
              message: 'An athlete must be identified for this scout event.',
              path: 'playerNumber',
            }],
            'error',
          );
    }
    const registered = this.resolver.resolve(
      { teamId: context.teamId, players: context.roster },
      candidate.playerNumber,
    );
    if (!registered) {
      return validationResult(
        [
          {
            code: 'player_not_registered',
            message: `Player ${candidate.playerNumber} is not registered for the active team.`,
            path: 'playerNumber',
          },
        ],
        context.enforceRegisteredPlayers ? 'error' : 'warning',
      );
    }
    if (
      context.lineup &&
      !Object.values(context.lineup.slots).some((slot) => slot.playerId === registered.id)
    ) {
      return validationResult(
        [
          {
            code: 'player_not_on_court',
            message: `Player ${candidate.playerNumber} is registered but is not on court.`,
            path: 'playerNumber',
          },
        ],
        'warning',
      );
    }
    return validationResult([]);
  }
}
