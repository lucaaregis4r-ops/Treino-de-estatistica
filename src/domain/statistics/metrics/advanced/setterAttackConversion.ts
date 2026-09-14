import type { CourtRotationPosition } from '../../../match/lineup/SetLineup';
import type { TacticalRallyProjection } from '../../../rally/context/TacticalRallyProjection';
import type { RallyPhase, ReceptionGrade, ScoutEvent } from '../../../scout/events/ScoutEvent';
import { tacticalValue } from '../../../scout/tactical/TacticalMetadataAdapter';
import type { MetricDefinition } from '../../definitions/MetricDefinition';

export const SETTER_ATTACK_CONVERSION_METRIC_ID = 'advanced.setter_attack_conversion';

export interface SetterAttackConversionReport {
  readonly teamId: string;
  readonly setterPlayerId: string;
  readonly setterPosition: CourtRotationPosition;
  readonly attackerPlayerId: string;
  readonly receptionGrade?: ReceptionGrade;
  readonly phase: RallyPhase;
  readonly attackCombination?: string;
  readonly volume: number;
  readonly points: number;
  readonly errors: number;
  readonly blocked: number;
}

export function setterAttackConversionReports(
  events: readonly ScoutEvent[],
  tacticalRally?: TacticalRallyProjection,
): readonly SetterAttackConversionReport[] {
  const groups = new Map<string, SetterAttackConversionReport>();
  events.forEach((event) => {
    if (event.skill !== 'attack' || !event.playerId) return;
    const contact = tacticalRally?.contacts.find((item) => item.sourceEventId === event.id);
    const setterPlayerId = event.setterPlayerId ?? contact?.setterPlayerId;
    const setterPosition = event.setterPosition ?? contact?.setterPosition;
    const phase = contact?.phase ?? tacticalValue.phase(event.metadata);
    if (!setterPlayerId || !setterPosition || !phase) return;
    const dimensions = {
      teamId: event.teamId,
      setterPlayerId,
      setterPosition,
      attackerPlayerId: event.playerId,
      ...(contact?.receptionForAttack?.grade
        ? { receptionGrade: contact.receptionForAttack.grade }
        : {}),
      phase,
      ...(tacticalValue.attackCombination(event.metadata)
        ? { attackCombination: tacticalValue.attackCombination(event.metadata) }
        : {}),
    };
    const key = JSON.stringify(dimensions);
    const row = groups.get(key) ?? {
      ...dimensions,
      volume: 0,
      points: 0,
      errors: 0,
      blocked: 0,
    };
    groups.set(key, {
      ...row,
      volume: row.volume + 1,
      points: row.points + (event.outcome === 'point' ? 1 : 0),
      errors: row.errors + (event.outcome === 'error' ? 1 : 0),
      blocked: row.blocked + (event.outcome === 'blocked' ? 1 : 0),
    });
  });
  return [...groups.values()];
}

export function createSetterAttackConversionMetricDefinition(): MetricDefinition {
  return {
    id: SETTER_ATTACK_CONVERSION_METRIC_ID,
    name: 'Setter Attack Conversion',
    requiredFields: ['skill', 'playerId', 'setterPlayerId', 'setterPosition'],
    calculate(context) {
      const rows = setterAttackConversionReports(context.events, context.tacticalRally).filter(
        (row) =>
          (!context.scope?.teamId || row.teamId === context.scope.teamId) &&
          (!context.scope?.setterPlayerId || row.setterPlayerId === context.scope.setterPlayerId) &&
          (!context.scope?.setterPosition || row.setterPosition === context.scope.setterPosition) &&
          (!context.scope?.playerId || row.attackerPlayerId === context.scope.playerId),
      );
      const volume = rows.reduce((sum, row) => sum + row.volume, 0);
      const points = rows.reduce((sum, row) => sum + row.points, 0);
      return {
        metricId: SETTER_ATTACK_CONVERSION_METRIC_ID,
        value: volume ? points / volume : null,
        numerator: points,
        denominator: volume,
        available: volume > 0,
        ...(volume ? {} : { reasonUnavailable: 'insufficient_sample' }),
      };
    },
  };
}
