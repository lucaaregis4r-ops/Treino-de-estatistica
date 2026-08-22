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
      (!context.scope?.rotation || tactical?.rotation === context.scope.rotation) &&
      (!context.scope?.phase || tactical?.phase === context.scope.phase) &&
      (!context.scope?.direction ||
        tacticalValue.direction(event.metadata, event.skill) === context.scope.direction)
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
