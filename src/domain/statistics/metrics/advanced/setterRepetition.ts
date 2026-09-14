import type { TacticalRallyProjection } from '../../../rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import type { MetricDefinition } from '../../definitions/MetricDefinition';

export const SETTER_REPETITION_METRIC_ID = 'advanced.setter_repetition';

export type SetterRepeatCategory =
  'overall' | 'after_point' | 'after_error' | 'after_blocked' | 'within_rally';

export interface SetterRepeatReport {
  readonly teamId: string;
  readonly setterPlayerId: string;
  readonly attackerPlayerId: string;
  readonly category: SetterRepeatCategory;
  readonly opportunities: number;
  readonly repeats: number;
}

interface AttackWithSetter {
  readonly event: ScoutEvent;
  readonly setterPlayerId: string;
}

function attacksWithSetter(
  events: readonly ScoutEvent[],
  tacticalRally: TacticalRallyProjection | undefined,
): readonly AttackWithSetter[] {
  return events
    .filter((event) => event.skill === 'attack' && Boolean(event.playerId))
    .map((event) => {
      const contact = tacticalRally?.contacts.find((item) => item.sourceEventId === event.id);
      const setterPlayerId = event.setterPlayerId ?? contact?.setterPlayerId;
      return setterPlayerId ? { event, setterPlayerId } : undefined;
    })
    .filter((item): item is AttackWithSetter => Boolean(item))
    .filter((item) => item.event.playerId !== item.setterPlayerId)
    .sort((left, right) => left.event.sequence - right.event.sequence);
}

function categoryForOutcome(outcome: string | undefined): SetterRepeatCategory | undefined {
  if (outcome === 'point') return 'after_point';
  if (outcome === 'error') return 'after_error';
  if (outcome === 'blocked') return 'after_blocked';
  return undefined;
}

export function setterRepetitionReports(
  events: readonly ScoutEvent[],
  tacticalRally?: TacticalRallyProjection,
): readonly SetterRepeatReport[] {
  const attacks = attacksWithSetter(events, tacticalRally);
  const totals = new Map<
    string,
    {
      dimensions: Omit<SetterRepeatReport, 'opportunities' | 'repeats'>;
      opportunities: number;
      repeats: number;
    }
  >();

  const add = (
    current: AttackWithSetter,
    next: AttackWithSetter,
    category: SetterRepeatCategory,
  ) => {
    const attackerPlayerId = current.event.playerId;
    if (!attackerPlayerId) return;
    const dimensions = {
      teamId: current.event.teamId,
      setterPlayerId: current.setterPlayerId,
      attackerPlayerId,
      category,
    };
    const key = JSON.stringify(dimensions);
    const row = totals.get(key) ?? { dimensions, opportunities: 0, repeats: 0 };
    row.opportunities += 1;
    if (next.event.playerId === attackerPlayerId) row.repeats += 1;
    totals.set(key, row);
  };

  const setGroups = new Map<string, AttackWithSetter[]>();
  attacks.forEach((attack) => {
    const key = JSON.stringify([
      attack.event.matchId,
      attack.event.setNumber,
      attack.event.teamId,
      attack.setterPlayerId,
    ]);
    setGroups.set(key, [...(setGroups.get(key) ?? []), attack]);
  });
  setGroups.forEach((group) => {
    group.slice(0, -1).forEach((current, index) => {
      const next = group[index + 1];
      add(current, next, 'overall');
      const outcomeCategory = categoryForOutcome(current.event.outcome);
      if (outcomeCategory) add(current, next, outcomeCategory);
    });
  });

  const rallyGroups = new Map<string, AttackWithSetter[]>();
  attacks.forEach((attack) => {
    const key = JSON.stringify([
      attack.event.matchId,
      attack.event.setNumber,
      attack.event.rallyId,
      attack.event.teamId,
      attack.setterPlayerId,
    ]);
    rallyGroups.set(key, [...(rallyGroups.get(key) ?? []), attack]);
  });
  rallyGroups.forEach((group) => {
    group.slice(0, -1).forEach((current, index) => add(current, group[index + 1], 'within_rally'));
  });

  return [...totals.values()].map(({ dimensions, opportunities, repeats }) => ({
    ...dimensions,
    opportunities,
    repeats,
  }));
}

export function createSetterRepetitionMetricDefinition(): MetricDefinition {
  return {
    id: SETTER_REPETITION_METRIC_ID,
    name: 'Setter Repetition',
    requiredFields: ['skill', 'playerId', 'setterPlayerId'],
    calculate(context) {
      const rows = setterRepetitionReports(context.events, context.tacticalRally).filter(
        (row) =>
          row.category === 'overall' &&
          (!context.scope?.teamId || row.teamId === context.scope.teamId) &&
          (!context.scope?.setterPlayerId || row.setterPlayerId === context.scope.setterPlayerId) &&
          (!context.scope?.playerId || row.attackerPlayerId === context.scope.playerId),
      );
      const opportunities = rows.reduce((sum, row) => sum + row.opportunities, 0);
      const repeats = rows.reduce((sum, row) => sum + row.repeats, 0);
      return {
        metricId: SETTER_REPETITION_METRIC_ID,
        value: opportunities ? repeats / opportunities : null,
        numerator: repeats,
        denominator: opportunities,
        available: opportunities > 0,
        ...(opportunities ? {} : { reasonUnavailable: 'insufficient_sample' }),
      };
    },
  };
}
