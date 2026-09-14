import { playerLineupContext } from '../../match/lineup/SetLineup';
import { RosterPlayerResolver } from '../../match/roster/TeamRoster';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from '../validators/ScoutValidationContext';
import { tacticalValue } from './TacticalMetadataAdapter';
import { TACTICAL_METADATA_SCHEMA_VERSION } from './TacticalMetadata';

/** Adds the attacker's current rotational position as the normal attack origin. */
export class AttackOriginResolver {
  private readonly rosterResolver = new RosterPlayerResolver();

  resolve(
    candidate: CanonicalScoutEventCandidate,
    context: ScoutValidationContext,
  ): CanonicalScoutEventCandidate {
    if (
      candidate.skill !== 'attack' ||
      candidate.playerNumber === undefined ||
      candidate.metadata?.spatial !== undefined ||
      tacticalValue.originZoneId(candidate.metadata, candidate.skill)
    )
      return candidate;

    const player = this.rosterResolver.resolve(
      { teamId: context.teamId, players: context.roster },
      candidate.playerNumber,
    );
    const lineupContext = player ? playerLineupContext(context.lineup, player.id) : undefined;
    if (!lineupContext) return candidate;

    const tactical = candidate.metadata?.tactical ?? {};
    const attack = tactical.attack ?? {};
    const currentTrajectory = attack.trajectory ?? tactical.trajectory ?? {};
    const trajectory = {
      ...currentTrajectory,
      origin: { zoneId: String(lineupContext.rotationPosition) },
      captureMethod: currentTrajectory.captureMethod ?? ('derived' as const),
    };

    return {
      ...candidate,
      metadata: {
        ...candidate.metadata,
        schemaVersion: TACTICAL_METADATA_SCHEMA_VERSION,
        tactical: {
          ...tactical,
          trajectory,
          attack: { ...attack, trajectory },
        },
      },
    };
  }
}
