import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import type { MetricContext } from '../definitions/MetricDefinition';
import { ReceptionContextResolver } from '../../rally/context/ReceptionContextResolver';
import { tacticalValue } from '../../scout/tactical/TacticalMetadataAdapter';

const receptionContextResolver = new ReceptionContextResolver();

export function scopedEvents(context: MetricContext): readonly ScoutEvent[] {
  return context.events.filter((event) => {
    const tactical = context.tacticalRally?.contacts.find(
      (contact) => contact.sourceEventId === event.id,
    );
    return (
      (!context.scope?.teamId || event.teamId === context.scope.teamId) &&
      (!context.scope?.playerId || event.playerId === context.scope.playerId) &&
      (!context.scope?.setNumber || event.setNumber === context.scope.setNumber) &&
      (!context.scope?.skill || event.skill === context.scope.skill) &&
      (!context.scope?.setterPlayerId ||
        (event.setterPlayerId ?? tactical?.setterPlayerId) === context.scope.setterPlayerId) &&
      (!context.scope?.setterPosition ||
        (event.setterPosition ?? tactical?.setterPosition) === context.scope.setterPosition) &&
      (!context.scope?.formationState ||
        (event.formationState ?? tactical?.formationState) === context.scope.formationState) &&
      (!context.scope?.rotation || tactical?.rotation === context.scope.rotation) &&
      (!context.scope?.phase || tactical?.phase === context.scope.phase) &&
      (!context.scope?.direction ||
        tacticalValue.direction(event.metadata, event.skill) === context.scope.direction) &&
      (!context.scope?.originZone ||
        tacticalValue.originZoneId(event.metadata, event.skill) === context.scope.originZone) &&
      (!context.scope?.targetZone ||
        tacticalValue.targetZoneId(event.metadata, event.skill) === context.scope.targetZone) &&
      (!context.scope?.attackType ||
        tacticalValue.skillType(event.metadata, event.skill) === context.scope.attackType) &&
      (!context.scope?.attackCombination ||
        tacticalValue.attackCombination(event.metadata) === context.scope.attackCombination) &&
      (!context.scope?.receptionGrade ||
        (event.skill === 'attack' ? tactical?.receptionForAttack?.grade : receptionGrade(event)) ===
          context.scope.receptionGrade) &&
      (context.scope?.blockersCount === undefined ||
        tacticalValue.blockersCount(event.metadata, event.skill) === context.scope.blockersCount)
    );
  });
}

export function receptionGrade(event: ScoutEvent): 'A' | 'B' | 'C' | 'ERROR' | undefined {
  return receptionContextResolver.grade(event);
}

export function nextReceptionForServe(
  serve: ScoutEvent,
  allEvents: readonly ScoutEvent[],
): ScoutEvent | undefined {
  return allEvents
    .filter(
      (event) =>
        event.rallyId === serve.rallyId &&
        event.sequence > serve.sequence &&
        event.skill === 'reception' &&
        event.teamId !== serve.teamId,
    )
    .sort((left, right) => left.sequence - right.sequence)[0];
}
