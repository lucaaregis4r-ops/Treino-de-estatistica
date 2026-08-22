import type { TacticalContactContext } from '../../../rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../../scout/events/ScoutEvent';
import { tacticalValue, toTacticalMetadata } from '../../../scout/tactical/TacticalMetadataAdapter';
import type { MetricContext, MetricDefinition } from '../../definitions/MetricDefinition';
import type { MetricBreakdownItem, MetricResult } from '../MetricResult';
import {
  nextReceptionForServe,
  receptionGrade,
  scopedEvents,
} from '../../queries/scoutEventQueries';

export const TACTICAL_METRIC_IDS = Object.freeze([
  'tactical.serve.origin_distribution',
  'tactical.serve.target_distribution',
  'tactical.serve.direction_distribution',
  'tactical.serve.impact_reception',
  'tactical.reception.quality_by_zone',
  'tactical.reception.quality_by_rotation',
  'tactical.attack.origin_distribution',
  'tactical.attack.target_distribution',
  'tactical.attack.direction_distribution',
  'tactical.attack.efficiency_by_direction',
  'tactical.attack.efficiency_by_type',
  'tactical.attack.efficiency_by_combination',
  'tactical.attack.by_rotation',
  'tactical.attack.by_reception_quality',
  'tactical.attack.by_phase',
  'tactical.attack.by_blockers',
  'tactical.setter.by_attacker',
  'tactical.setter.by_zone',
  'tactical.setter.by_call',
  'tactical.setter.by_rotation',
  'tactical.setter.by_reception_quality',
  'tactical.rally.sideout',
  'tactical.rally.breakpoint',
  'tactical.rally.transition',
] as const);

type CategoryResolver = (event: ScoutEvent, context: MetricContext) => string | number | undefined;

function unavailable(
  metricId: string,
  components?: Readonly<Record<string, number>>,
): MetricResult {
  return {
    metricId,
    value: null,
    numerator: 0,
    denominator: 0,
    ...(components ? { components } : {}),
    breakdown: Object.freeze([]),
    available: false,
    reasonUnavailable: 'Sem metadata tática suficiente para calcular a métrica.',
  };
}

function result(
  metricId: string,
  numerator: number,
  denominator: number,
  components: Readonly<Record<string, number>>,
  breakdown: readonly MetricBreakdownItem[],
): MetricResult {
  if (denominator === 0) return unavailable(metricId, components);
  return {
    metricId,
    value: numerator / denominator,
    numerator,
    denominator,
    components,
    breakdown: Object.freeze(breakdown),
    available: true,
  };
}

function grouped(
  events: readonly ScoutEvent[],
  context: MetricContext,
  category: CategoryResolver,
): Map<string, ScoutEvent[]> {
  const groups = new Map<string, ScoutEvent[]>();
  for (const event of events) {
    const key = category(event, context);
    if (key === undefined || key === '') continue;
    const normalized = String(key);
    groups.set(normalized, [...(groups.get(normalized) ?? []), event]);
  }
  return groups;
}

function distributionMetric(
  id: string,
  name: string,
  skill: ScoutEvent['skill'],
  category: CategoryResolver,
): MetricDefinition {
  return {
    id,
    name,
    requiredFields: ['skill', 'tacticalMetadata'],
    calculate(context) {
      const events = scopedEvents(context).filter((event) => event.skill === skill);
      const groups = grouped(events, context, category);
      const captured = [...groups.values()].reduce((sum, items) => sum + items.length, 0);
      if (captured === 0) return unavailable(id, { events: events.length, captured: 0 });
      const components = Object.fromEntries(
        [...groups.entries()].map(([key, items]) => [key, items.length]),
      );
      const breakdown = [...groups.entries()]
        .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
        .map(([key, items]) => ({
          key,
          label: key,
          value: items.length / captured,
          numerator: items.length,
          denominator: captured,
          components: { events: items.length },
        }));
      return result(
        id,
        captured,
        events.length || captured,
        { ...components, captured },
        breakdown,
      );
    },
  };
}

function efficiencyMetric(id: string, name: string, category: CategoryResolver): MetricDefinition {
  return {
    id,
    name,
    requiredFields: ['skill', 'outcome', 'tacticalMetadata'],
    calculate(context) {
      const attacks = scopedEvents(context).filter((event) => event.skill === 'attack');
      const groups = grouped(attacks, context, category);
      if (groups.size === 0) return unavailable(id, { attacks: attacks.length });
      const breakdown = [...groups.entries()].map(([key, events]) => {
        const points = events.filter((event) => event.outcome === 'point').length;
        const errors = events.filter((event) => event.outcome === 'error').length;
        const blocked = events.filter((event) => event.outcome === 'blocked').length;
        return {
          key,
          label: key,
          value: (points - errors - blocked) / events.length,
          numerator: points - errors - blocked,
          denominator: events.length,
          components: { points, errors, blocked, attacks: events.length },
        };
      });
      const numerator = breakdown.reduce((sum, item) => sum + item.numerator, 0);
      const denominator = breakdown.reduce((sum, item) => sum + item.denominator, 0);
      return result(id, numerator, denominator, { attacks: denominator }, breakdown);
    },
  };
}

function receptionQualityMetric(
  id: string,
  name: string,
  category: CategoryResolver,
): MetricDefinition {
  return {
    id,
    name,
    requiredFields: ['skill', 'receptionGrade', 'tacticalMetadata'],
    calculate(context) {
      const receptions = scopedEvents(context).filter((event) => event.skill === 'reception');
      const groups = grouped(receptions, context, category);
      if (groups.size === 0) return unavailable(id, { receptions: receptions.length });
      const breakdown = [...groups.entries()].map(([key, events]) => {
        const grades = events.map(receptionGrade);
        const A = grades.filter((grade) => grade === 'A').length;
        const B = grades.filter((grade) => grade === 'B').length;
        const C = grades.filter((grade) => grade === 'C').length;
        const errors = grades.filter((grade) => grade === 'ERROR').length;
        return {
          key,
          label: key,
          value: (A + B) / events.length,
          numerator: A + B,
          denominator: events.length,
          components: { A, B, C, errors },
        };
      });
      const numerator = breakdown.reduce((sum, item) => sum + item.numerator, 0);
      const denominator = breakdown.reduce((sum, item) => sum + item.denominator, 0);
      return result(id, numerator, denominator, { receptions: denominator }, breakdown);
    },
  };
}

function tacticalContext(
  event: ScoutEvent,
  context: MetricContext,
): TacticalContactContext | undefined {
  return context.tacticalRally?.contacts.find((contact) => contact.sourceEventId === event.id);
}

function previousReception(event: ScoutEvent, context: MetricContext): ScoutEvent | undefined {
  return [...context.events]
    .filter(
      (candidate) =>
        candidate.rallyId === event.rallyId &&
        candidate.teamId === event.teamId &&
        candidate.skill === 'reception' &&
        candidate.sequence < event.sequence,
    )
    .sort((left, right) => right.sequence - left.sequence)[0];
}

const origin: CategoryResolver = (event) => tacticalValue.originZoneId(event.metadata, event.skill);
const target: CategoryResolver = (event) => tacticalValue.targetZoneId(event.metadata, event.skill);
const direction: CategoryResolver = (event) => tacticalValue.direction(event.metadata, event.skill);
const receptionZone: CategoryResolver = (event) =>
  event.metadata
    ? toTacticalMetadata(event.metadata, 'reception').reception?.contactLocation?.zoneId
    : undefined;
const rotation: CategoryResolver = (event, context) => tacticalContext(event, context)?.rotation;
const phase: CategoryResolver = (event, context) => tacticalContext(event, context)?.phase;
const receptionQuality: CategoryResolver = (event, context) => {
  const reception = previousReception(event, context);
  return reception ? receptionGrade(reception) : undefined;
};

function serveImpactMetric(): MetricDefinition {
  const id = 'tactical.serve.impact_reception';
  return {
    id,
    name: 'Impacto do saque na recepção',
    requiredFields: ['skill', 'receptionGrade'],
    calculate(context) {
      const serves = scopedEvents(context).filter((event) => event.skill === 'serve');
      const receptions = serves.flatMap((serve) => {
        const reception = nextReceptionForServe(serve, context.events);
        return reception ? [reception] : [];
      });
      const grades = receptions.map(receptionGrade);
      const A = grades.filter((grade) => grade === 'A').length;
      const B = grades.filter((grade) => grade === 'B').length;
      const C = grades.filter((grade) => grade === 'C').length;
      const errors = grades.filter((grade) => grade === 'ERROR').length;
      return result(
        id,
        C + errors,
        receptions.length,
        { A, B, C, errors, serves: serves.length, linkedReceptions: receptions.length },
        [
          {
            key: 'pressure',
            label: 'Recepções C ou erro',
            value: receptions.length ? (C + errors) / receptions.length : null,
            numerator: C + errors,
            denominator: receptions.length,
            components: { C, errors },
          },
        ],
      );
    },
  };
}

function rallyRateMetric(
  id: string,
  name: string,
  phaseName: 'sideout' | 'breakpoint' | 'transition',
): MetricDefinition {
  return {
    id,
    name,
    requiredFields: ['rallyResult', 'servingTeam'],
    calculate(context) {
      const rallies = context.tacticalRally?.rallies ?? [];
      const teamId = context.scope?.teamId;
      const opportunities = rallies.flatMap((rally) => {
        if (!rally.winnerTeamId || !rally.servingTeamId) return [];
        if (phaseName === 'sideout') {
          const receivingTeamId =
            rally.servingTeamId === rally.winnerTeamId ? undefined : rally.winnerTeamId;
          if (teamId && rally.servingTeamId === teamId) return [];
          return [{ won: teamId ? rally.winnerTeamId === teamId : receivingTeamId !== undefined }];
        }
        if (phaseName === 'breakpoint') {
          if (teamId && rally.servingTeamId !== teamId) return [];
          return [{ won: rally.winnerTeamId === (teamId ?? rally.servingTeamId) }];
        }
        const teams = teamId
          ? rally.transitionTeamIds.filter((candidate) => candidate === teamId)
          : rally.transitionTeamIds;
        return teams.map((candidate) => ({ won: rally.winnerTeamId === candidate }));
      });
      const wins = opportunities.filter((item) => item.won).length;
      return result(id, wins, opportunities.length, { wins, opportunities: opportunities.length }, [
        {
          key: phaseName,
          label: phaseName,
          value: opportunities.length ? wins / opportunities.length : null,
          numerator: wins,
          denominator: opportunities.length,
          components: { wins },
        },
      ]);
    },
  };
}

export function createTacticalMetricDefinitions(): readonly MetricDefinition[] {
  return [
    distributionMetric(TACTICAL_METRIC_IDS[0], 'Origem do saque', 'serve', origin),
    distributionMetric(TACTICAL_METRIC_IDS[1], 'Destino do saque', 'serve', target),
    distributionMetric(TACTICAL_METRIC_IDS[2], 'Direção do saque', 'serve', direction),
    serveImpactMetric(),
    receptionQualityMetric(TACTICAL_METRIC_IDS[4], 'Qualidade da recepção por zona', receptionZone),
    receptionQualityMetric(TACTICAL_METRIC_IDS[5], 'Qualidade da recepção por rotação', rotation),
    distributionMetric(TACTICAL_METRIC_IDS[6], 'Origem do ataque', 'attack', origin),
    distributionMetric(TACTICAL_METRIC_IDS[7], 'Destino do ataque', 'attack', target),
    distributionMetric(TACTICAL_METRIC_IDS[8], 'Direção do ataque', 'attack', direction),
    efficiencyMetric(TACTICAL_METRIC_IDS[9], 'Eficiência do ataque por direção', direction),
    efficiencyMetric(TACTICAL_METRIC_IDS[10], 'Eficiência do ataque por tipo', (event) =>
      tacticalValue.skillType(event.metadata, event.skill),
    ),
    efficiencyMetric(TACTICAL_METRIC_IDS[11], 'Eficiência do ataque por combinação', (event) =>
      tacticalValue.attackCombination(event.metadata),
    ),
    distributionMetric(TACTICAL_METRIC_IDS[12], 'Ataques por rotação', 'attack', rotation),
    distributionMetric(
      TACTICAL_METRIC_IDS[13],
      'Ataques por qualidade da recepção',
      'attack',
      receptionQuality,
    ),
    distributionMetric(TACTICAL_METRIC_IDS[14], 'Ataques por fase', 'attack', phase),
    distributionMetric(TACTICAL_METRIC_IDS[15], 'Ataques por bloqueadores', 'attack', (event) =>
      tacticalValue.blockersCount(event.metadata, event.skill),
    ),
    distributionMetric(TACTICAL_METRIC_IDS[16], 'Levantamentos por atacante', 'set', (event) =>
      event.metadata ? toTacticalMetadata(event.metadata, 'set').set?.targetPlayerId : undefined,
    ),
    distributionMetric(TACTICAL_METRIC_IDS[17], 'Levantamentos por zona', 'set', target),
    distributionMetric(TACTICAL_METRIC_IDS[18], 'Levantamentos por chamada', 'set', (event) =>
      tacticalValue.setterCall(event.metadata),
    ),
    distributionMetric(TACTICAL_METRIC_IDS[19], 'Levantamentos por rotação', 'set', rotation),
    distributionMetric(
      TACTICAL_METRIC_IDS[20],
      'Levantamentos por qualidade da recepção',
      'set',
      receptionQuality,
    ),
    rallyRateMetric(TACTICAL_METRIC_IDS[21], 'Sideout', 'sideout'),
    rallyRateMetric(TACTICAL_METRIC_IDS[22], 'Breakpoint', 'breakpoint'),
    rallyRateMetric(TACTICAL_METRIC_IDS[23], 'Transição', 'transition'),
  ];
}
