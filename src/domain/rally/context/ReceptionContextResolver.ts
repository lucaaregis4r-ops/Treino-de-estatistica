import type { ProjectedScoutEvent } from '../../match/events/ScoutTimeline';
import type { ReceptionGrade, ScoutEvent } from '../../scout/events/ScoutEvent';
import { tacticalValue } from '../../scout/tactical/TacticalMetadataAdapter';

export interface ReceptionAttackContext {
  readonly receptionEventId: string;
  readonly grade?: ReceptionGrade;
}

export class ReceptionContextResolver {
  grade(event: ScoutEvent): ReceptionGrade | undefined {
    const explicit = tacticalValue.receptionGrade(event.metadata);
    if (explicit) return explicit;
    if (event.outcome === 'error' || event.evaluation === 'error') return 'ERROR';
    if (event.outcome === 'perfect' || event.evaluation === 'excellent') return 'A';
    if (event.evaluation === 'positive') return 'B';
    if (event.evaluation === 'negative' || event.evaluation === 'very_negative') return 'C';
    return undefined;
  }

  resolveForAttack(
    attack: ProjectedScoutEvent,
    previousContacts: readonly ProjectedScoutEvent[],
  ): ReceptionAttackContext | undefined {
    if (attack.event.skill !== 'attack') return undefined;
    const reception = [...previousContacts]
      .reverse()
      .find(
        (contact) =>
          contact.event.rallyId === attack.event.rallyId &&
          contact.event.teamId === attack.event.teamId &&
          contact.event.skill === 'reception',
      );
    return reception
      ? {
          receptionEventId: reception.sourceEventId,
          ...(this.grade(reception.event) ? { grade: this.grade(reception.event) } : {}),
        }
      : undefined;
  }
}
