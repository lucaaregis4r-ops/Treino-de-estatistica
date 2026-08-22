import type { MetricContext, MetricDefinition } from '../../definitions/MetricDefinition';
import type { MetricResult } from '../MetricResult';
import {
  nextReceptionForServe,
  receptionGrade,
  scopedEvents,
} from '../../queries/scoutEventQueries';

function result(
  metricId: string,
  numerator: number,
  denominator?: number,
  components?: Readonly<Record<string, number>>,
): MetricResult {
  if (denominator === 0) {
    return {
      metricId,
      value: null,
      numerator,
      denominator,
      ...(components ? { components } : {}),
      available: false,
      reasonUnavailable: 'Sem volume suficiente para calcular a métrica.',
    };
  }
  return {
    metricId,
    value: denominator === undefined ? numerator : numerator / denominator,
    numerator,
    ...(denominator === undefined ? {} : { denominator }),
    ...(components ? { components } : {}),
    available: true,
  };
}

function countMetric(
  id: string,
  name: string,
  predicate: (context: MetricContext) => number,
): MetricDefinition {
  return {
    id,
    name,
    requiredFields: ['skill'],
    calculate: (context) => result(id, predicate(context)),
  };
}

function ratioMetric(
  id: string,
  name: string,
  calculate: (context: MetricContext) => {
    numerator: number;
    denominator: number;
    components?: Readonly<Record<string, number>>;
  },
): MetricDefinition {
  return {
    id,
    name,
    requiredFields: ['skill', 'outcome'],
    calculate: (context) => {
      const values = calculate(context);
      return result(id, values.numerator, values.denominator, values.components);
    },
  };
}

const skillEvents = (context: MetricContext, skill: string) =>
  scopedEvents(context).filter((event) => event.skill === skill);

const outcomeCount = (context: MetricContext, skill: string, outcome: string) =>
  skillEvents(context, skill).filter((event) => event.outcome === outcome).length;

export const BASIC_METRIC_IDS = Object.freeze([
  'volleyball.attack.volume',
  'volleyball.attack.points',
  'volleyball.attack.errors',
  'volleyball.attack.success',
  'volleyball.attack.efficiency',
  'volleyball.serve.volume',
  'volleyball.serve.aces',
  'volleyball.serve.errors',
  'volleyball.serve.success',
  'volleyball.reception.volume',
  'volleyball.reception.positive',
  'volleyball.reception.perfect',
  'volleyball.reception.distribution',
  'volleyball.block.points',
] as const);

export const CBV_METRIC_IDS = Object.freeze([
  'cbv.2025_26.attack',
  'cbv.2025_26.attack_efficiency',
  'cbv.2025_26.serve',
  'cbv.2025_26.serve_efficiency',
  'cbv.2025_26.block',
  'cbv.2025_26.block_efficiency',
  'cbv.2025_26.pass_efficiency',
  'cbv.2025_26.top_scorer',
] as const);

export function createVolleyballMetricDefinitions(): readonly MetricDefinition[] {
  const attackSuccess = (id: string, name: string) =>
    ratioMetric(id, name, (context) => ({
      numerator: outcomeCount(context, 'attack', 'point'),
      denominator: skillEvents(context, 'attack').length,
    }));
  const attackEfficiency = (id: string, name: string) =>
    ratioMetric(id, name, (context) => {
      const attacks = skillEvents(context, 'attack');
      const points = attacks.filter((event) => event.outcome === 'point').length;
      const errors = attacks.filter((event) => event.outcome === 'error').length;
      const blocked = attacks.filter((event) => event.outcome === 'blocked').length;
      return {
        numerator: points - errors - blocked,
        denominator: attacks.length,
        components: { points, errors, blocked },
      };
    });
  const serveEfficiency = (id: string, name: string) =>
    ratioMetric(id, name, (context) => {
      const serves = skillEvents(context, 'serve');
      const aces = serves.filter((event) => event.outcome === 'ace').length;
      const passC = serves.filter((serve) => {
        const reception = nextReceptionForServe(serve, context.events);
        return reception ? receptionGrade(reception) === 'C' : false;
      }).length;
      return { numerator: aces + passC, denominator: serves.length, components: { aces, passC } };
    });
  const passEfficiency = (id: string, name: string) =>
    ratioMetric(id, name, (context) => {
      const receptions = skillEvents(context, 'reception');
      const grades = receptions.map(receptionGrade);
      const gradeA = grades.filter((grade) => grade === 'A').length;
      const gradeB = grades.filter((grade) => grade === 'B').length;
      const gradeC = grades.filter((grade) => grade === 'C').length;
      const errors = grades.filter((grade) => grade === 'ERROR').length;
      return {
        numerator: gradeA + gradeB,
        denominator: receptions.length,
        components: { A: gradeA, B: gradeB, C: gradeC, errors },
      };
    });
  const blockEfficiency = ratioMetric(
    'cbv.2025_26.block_efficiency',
    'Eficiência de bloqueio CBV',
    (context) => {
      const points = outcomeCount(context, 'block', 'point');
      const explicitSets = context.scope?.playerId
        ? new Set(
            context.playerSetParticipations
              ?.filter((item) => item.playerId === context.scope?.playerId)
              .map((item) => item.setNumber),
          ).size
        : 0;
      const observedSets = new Set(scopedEvents(context).map((event) => event.setNumber)).size;
      return {
        numerator: points,
        denominator: explicitSets || observedSets,
        components: { blockPoints: points, setsPlayed: explicitSets || observedSets },
      };
    },
  );

  return [
    countMetric(
      'volleyball.attack.volume',
      'Ataques',
      (context) => skillEvents(context, 'attack').length,
    ),
    countMetric('volleyball.attack.points', 'Pontos de ataque', (context) =>
      outcomeCount(context, 'attack', 'point'),
    ),
    countMetric('volleyball.attack.errors', 'Erros de ataque', (context) =>
      outcomeCount(context, 'attack', 'error'),
    ),
    attackSuccess('volleyball.attack.success', 'Sucesso no ataque'),
    attackEfficiency('volleyball.attack.efficiency', 'Eficiência no ataque'),
    countMetric(
      'volleyball.serve.volume',
      'Saques',
      (context) => skillEvents(context, 'serve').length,
    ),
    countMetric('volleyball.serve.aces', 'Aces', (context) =>
      outcomeCount(context, 'serve', 'ace'),
    ),
    countMetric('volleyball.serve.errors', 'Erros de saque', (context) =>
      outcomeCount(context, 'serve', 'error'),
    ),
    ratioMetric('volleyball.serve.success', 'Sucesso no saque', (context) => ({
      numerator: outcomeCount(context, 'serve', 'ace'),
      denominator: skillEvents(context, 'serve').length,
    })),
    countMetric(
      'volleyball.reception.volume',
      'Recepções',
      (context) => skillEvents(context, 'reception').length,
    ),
    ratioMetric('volleyball.reception.positive', 'Recepção positiva', (context) => {
      const receptions = skillEvents(context, 'reception');
      return {
        numerator: receptions.filter((event) => ['A', 'B'].includes(receptionGrade(event) ?? ''))
          .length,
        denominator: receptions.length,
      };
    }),
    ratioMetric('volleyball.reception.perfect', 'Recepção perfeita', (context) => {
      const receptions = skillEvents(context, 'reception');
      return {
        numerator: receptions.filter((event) => receptionGrade(event) === 'A').length,
        denominator: receptions.length,
      };
    }),
    ratioMetric('volleyball.reception.distribution', 'Distribuição da recepção', (context) => {
      const receptions = skillEvents(context, 'reception');
      const components = { A: 0, B: 0, C: 0, errors: 0 };
      receptions.forEach((event) => {
        const grade = receptionGrade(event);
        if (grade === 'ERROR') components.errors += 1;
        else if (grade) components[grade] += 1;
      });
      return { numerator: receptions.length, denominator: receptions.length, components };
    }),
    countMetric('volleyball.block.points', 'Pontos de bloqueio', (context) =>
      outcomeCount(context, 'block', 'point'),
    ),
    attackSuccess('cbv.2025_26.attack', 'Ataque CBV'),
    attackEfficiency('cbv.2025_26.attack_efficiency', 'Eficiência de ataque CBV'),
    countMetric('cbv.2025_26.serve', 'Pontos de saque CBV', (context) =>
      outcomeCount(context, 'serve', 'ace'),
    ),
    serveEfficiency('cbv.2025_26.serve_efficiency', 'Eficiência de saque CBV'),
    countMetric('cbv.2025_26.block', 'Pontos de bloqueio CBV', (context) =>
      outcomeCount(context, 'block', 'point'),
    ),
    blockEfficiency,
    passEfficiency('cbv.2025_26.pass_efficiency', 'Eficiência de passe CBV'),
    countMetric(
      'cbv.2025_26.top_scorer',
      'Pontuação total CBV',
      (context) =>
        scopedEvents(context).filter(
          (event) => event.outcome === 'point' || event.outcome === 'ace',
        ).length,
    ),
  ];
}
