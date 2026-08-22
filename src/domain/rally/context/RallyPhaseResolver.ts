import type { ProjectedScoutEvent } from '../../match/events/ScoutTimeline';
import type { RallyPhase } from '../../scout/events/ScoutEvent';
import { tacticalValue } from '../../scout/tactical/TacticalMetadataAdapter';
import { PhaseClassifier } from '../rules/PhaseClassifier';

export interface RallyPhaseResolutionInput {
  readonly contact: ProjectedScoutEvent;
  readonly previousContacts: readonly ProjectedScoutEvent[];
  readonly servingTeamId?: string;
  readonly receivingTeamId?: string;
}

export class RallyPhaseResolver {
  constructor(private readonly classifier = new PhaseClassifier()) {}

  resolve(input: RallyPhaseResolutionInput): RallyPhase {
    const explicit = tacticalValue.phase(input.contact.event.metadata);
    if (explicit) return explicit;
    return this.classifier.classify({
      eventTeamId: input.contact.event.teamId,
      servingTeamId: input.servingTeamId,
      receivingTeamId: input.receivingTeamId,
      hasPreviousAttack: input.previousContacts.some((contact) => contact.event.skill === 'attack'),
    });
  }
}
