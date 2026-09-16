import {
  MarkovAnalyzer,
  SequencePatternAnalyzer,
  SpatialValueEstimator,
  type SpatialRegionFinding,
  type TransitionFinding,
} from '../../domain/analytics/markov';
import type { RallySequence, SequenceObservation } from '../../domain/analytics/sequence';
import { tacticalValue } from '../../domain/scout/tactical/TacticalMetadataAdapter';
import type { SequenceAnalytics, TeamSequenceAnalytics } from './SequenceAnalyticsService';

export const TACTICAL_QUESTION_IDS = [
  'top_positive_transitions',
  'top_negative_transitions',
  'patterns_before_points',
  'patterns_before_errors',
  'best_rotation_pattern',
  'sequences_after_reception_grade',
  'sideout_breakpoint_patterns',
  'insufficient_sample_findings',
  'reception_destination_regions',
  'serve_destination_regions',
  'attack_origin_regions',
  'attack_destination_regions',
  'attack_trajectories',
] as const;

export type TacticalQuestionId = (typeof TACTICAL_QUESTION_IDS)[number];
export type TacticalQuestionAnswerType = 'transition' | 'pattern' | 'context' | 'spatial_region' | 'insufficient_sample';

export interface TacticalQuestionFilters {
  readonly teamId: string;
  readonly setNumber?: number;
  readonly rotation?: number;
  readonly phase?: 'sideout' | 'breakpoint' | 'transition';
  readonly receptionGrade?: 'A' | 'B' | 'C' | 'ERROR';
}

export interface TacticalQuestionSample {
  readonly n: number;
  readonly unit: 'rally' | 'event';
  readonly completeRallies: number;
}

export interface TacticalQuestionFinding {
  readonly findingId: string;
  readonly label: string;
  readonly numbers: Readonly<Record<string, number | null>>;
  readonly sample: TacticalQuestionSample;
  readonly filters: TacticalQuestionFilters;
  readonly baseline?: Readonly<Record<string, number | null>>;
  readonly available: boolean;
  readonly caveats: readonly string[];
}

export interface TacticalQuestionAnswer {
  readonly questionId: TacticalQuestionId;
  readonly answerType: TacticalQuestionAnswerType;
  readonly status: 'available' | 'unavailable';
  readonly filters: TacticalQuestionFilters;
  readonly sample: TacticalQuestionSample;
  readonly findings: readonly TacticalQuestionFinding[];
  readonly caveats: readonly string[];
  readonly reasonUnavailable?: 'no_data' | 'missing_coordinates' | 'insufficient_sample';
}

function observationFor(sequence: RallySequence, predicate: (observation: SequenceObservation) => boolean) {
  return sequence.observations.find(predicate);
}

function filteredSequences(data: TeamSequenceAnalytics, filters: TacticalQuestionFilters): readonly RallySequence[] {
  return data.sequences.filter((sequence) => {
    if (sequence.status !== 'complete') return false;
    if (filters.setNumber !== undefined && sequence.setNumber !== filters.setNumber) return false;
    if (filters.rotation !== undefined) {
      const hasRotation = sequence.observations.some(
        (observation) =>
          (observation.event.setterPosition ?? observation.event.metadata?.rotation) === filters.rotation ||
          observation.event.lineupContext?.rotationPosition === filters.rotation,
      );
      if (!hasRotation) return false;
    }
    if (filters.phase !== undefined) {
      const hasPhase = sequence.observations.some(
        (observation) => (observation.event.metadata?.phase ?? observation.event.metadata?.tactical?.phase) === filters.phase,
      );
      if (!hasPhase) return false;
    }
    if (filters.receptionGrade !== undefined) {
      const reception = observationFor(sequence, (observation) => observation.event.skill === 'reception');
      if (!reception || tacticalValue.receptionGrade(reception.event.metadata) !== filters.receptionGrade) return false;
    }
    return true;
  });
}

function sample(sequences: readonly RallySequence[], n: number, unit: 'rally' | 'event'): TacticalQuestionSample {
  return { n, unit, completeRallies: sequences.length };
}

function caveatsFor(n: number, available: boolean): readonly string[] {
  return available ? [] : ['small_sample', `n=${n}`, 'not_rankable'];
}

function transitionFinding(item: TransitionFinding, filters: TacticalQuestionFilters, completeRallies: number): TacticalQuestionFinding {
  return {
    findingId: item.id,
    label: `${item.from} -> ${item.to}`,
    numbers: {
      count: item.count,
      probability: item.probability,
      deltaPointProbability: item.deltaPointProbability,
    },
    sample: { n: item.count, unit: 'event', completeRallies },
    filters,
    baseline: { fromStatePointProbability: item.fromStatePointProbability },
    available: item.available,
    caveats: caveatsFor(item.count, item.available),
  };
}

function patternFinding(
  item: { readonly pattern: readonly string[]; readonly occurrences: number; readonly wins: number; readonly losses: number; readonly pointProbability: number | null; readonly liftVsBaseline: number | null },
  filters: TacticalQuestionFilters,
  completeRallies: number,
): TacticalQuestionFinding {
  return {
    findingId: `pattern-${item.pattern.join('-')}`,
    label: item.pattern.join(' -> '),
    numbers: { occurrences: item.occurrences, wins: item.wins, losses: item.losses, pointProbability: item.pointProbability, liftVsBaseline: item.liftVsBaseline },
    sample: { n: item.occurrences, unit: 'rally', completeRallies },
    filters,
    available: item.occurrences >= 5,
    caveats: caveatsFor(item.occurrences, item.occurrences >= 5),
  };
}

function spatialFinding(item: SpatialRegionFinding, filters: TacticalQuestionFilters, completeRallies: number): TacticalQuestionFinding {
  return {
    findingId: item.findingId,
    label: item.regionId
      ? `região ${item.regionId}`
      : `${item.originRegionId} -> ${item.targetRegionId}`,
    numbers: {
      n: item.n,
      wins: item.wins,
      losses: item.losses,
      empiricalPointProbability: item.empiricalPointProbability,
      deltaVsBaseline: item.deltaVsBaseline,
    },
    sample: { n: item.n, unit: item.sampleUnit, completeRallies },
    filters,
    baseline: { pointProbability: item.baselinePointProbability },
    available: item.available,
    caveats: caveatsFor(item.n, item.available),
  };
}

export class TacticalQuestionService {
  constructor(
    private readonly markov = new MarkovAnalyzer(),
    private readonly patterns = new SequencePatternAnalyzer(),
    private readonly spatial = new SpatialValueEstimator(),
  ) {}

  answer(
    analytics: SequenceAnalytics,
    questionId: TacticalQuestionId,
    filters: TacticalQuestionFilters,
  ): TacticalQuestionAnswer {
    const data = analytics.teams.find((team) => team.teamId === filters.teamId);
    const baseSample = sample([], 0, questionId.startsWith('attack_') || questionId.includes('regions') ? 'event' : 'rally');
    if (!data) {
      return { questionId, answerType: questionId === 'insufficient_sample_findings' ? 'insufficient_sample' : 'context', status: 'unavailable', filters, sample: baseSample, findings: [], caveats: ['team_not_found'], reasonUnavailable: 'no_data' };
    }
    const sequences = filteredSequences(data, filters);
    const markov = this.markov.analyze(sequences, filters.teamId);
    const completeRallies = sequences.length;
    const answer = (answerType: TacticalQuestionAnswerType, findings: readonly TacticalQuestionFinding[], unit: 'rally' | 'event', reason?: TacticalQuestionAnswer['reasonUnavailable']): TacticalQuestionAnswer => ({
      questionId,
      answerType,
      status: findings.some((finding) => finding.available) ? 'available' : 'unavailable',
      filters,
      sample: sample(sequences, findings.reduce((sum, finding) => sum + finding.sample.n, 0), unit),
      findings,
      caveats: findings.some((finding) => finding.available) ? [] : [reason ?? 'insufficient_sample'],
      ...(reason ? { reasonUnavailable: reason } : {}),
    });

    if (questionId === 'top_positive_transitions' || questionId === 'top_negative_transitions') {
      const positive = questionId === 'top_positive_transitions';
      const transitions = [...markov.transitions]
        .filter((item) => item.deltaPointProbability !== null)
        .sort((left, right) => (positive ? 1 : -1) * ((right.deltaPointProbability ?? 0) - (left.deltaPointProbability ?? 0)))
        .slice(0, 5);
      return answer('transition', transitions.map((item) => transitionFinding({ ...item, sampleSize: completeRallies }, filters, completeRallies)), 'event');
    }

    if (questionId === 'patterns_before_points' || questionId === 'patterns_before_errors') {
      const values = this.patterns.analyze(sequences, filters.teamId, 2)
        .filter((item) => questionId === 'patterns_before_points' ? item.wins > 0 : item.losses > 0)
        .sort((left, right) => (right.pointProbability ?? -Infinity) - (left.pointProbability ?? -Infinity))
        .slice(0, 5);
      return answer('pattern', values.map((item) => patternFinding(item, filters, completeRallies)), 'rally');
    }

    if (questionId === 'best_rotation_pattern') return this.rotationAnswer(sequences, filters, answer);
    if (questionId === 'sequences_after_reception_grade') return this.receptionGradeAnswer(sequences, filters, answer);
    if (questionId === 'sideout_breakpoint_patterns') return this.phaseAnswer(sequences, filters, answer);
    if (questionId === 'insufficient_sample_findings') {
      const findings = [
        ...markov.transitions.filter((item) => !item.available).map((item) => transitionFinding(item, filters, completeRallies)),
        ...this.patterns.analyze(sequences, filters.teamId, 2).filter((item) => item.occurrences < 5).map((item) => patternFinding(item, filters, completeRallies)),
        ...['reception', 'serve', 'attack'].flatMap((skill) => this.spatial.regions(sequences, filters.teamId, skill).filter((item) => !item.available).map((item) => spatialFinding(item, filters, completeRallies))),
      ];
      return { ...answer('insufficient_sample', findings, 'event', findings.length ? 'insufficient_sample' : 'no_data'), status: findings.length ? 'available' : 'unavailable' };
    }

    const spatialQuestion = this.spatialQuestion(questionId);
    const regions = this.spatial.regions(sequences, filters.teamId, spatialQuestion.skill)
      .filter((item) => item.spatialRole === spatialQuestion.role)
      .sort((left, right) => (right.deltaVsBaseline ?? -Infinity) - (left.deltaVsBaseline ?? -Infinity))
      .slice(0, 5);
    const findings = regions.map((item) => spatialFinding(item, filters, completeRallies));
    return {
      ...answer('spatial_region', findings, 'event', findings.length ? (findings.some((item) => item.available) ? undefined : 'insufficient_sample') : 'missing_coordinates'),
      status: findings.some((item) => item.available) ? 'available' : 'unavailable',
    };
  }

  private spatialQuestion(questionId: TacticalQuestionId): { readonly skill: string; readonly role: 'origin' | 'target' | 'trajectory' } {
    switch (questionId) {
      case 'reception_destination_regions': return { skill: 'reception', role: 'target' };
      case 'serve_destination_regions': return { skill: 'serve', role: 'target' };
      case 'attack_origin_regions': return { skill: 'attack', role: 'origin' };
      case 'attack_destination_regions': return { skill: 'attack', role: 'target' };
      case 'attack_trajectories': return { skill: 'attack', role: 'trajectory' };
      default: return { skill: 'attack', role: 'target' };
    }
  }

  private rotationAnswer(
    sequences: readonly RallySequence[],
    filters: TacticalQuestionFilters,
    answer: (type: TacticalQuestionAnswerType, findings: readonly TacticalQuestionFinding[], unit: 'rally' | 'event', reason?: TacticalQuestionAnswer['reasonUnavailable']) => TacticalQuestionAnswer,
  ): TacticalQuestionAnswer {
    const groups = new Map<number, RallySequence[]>();
    sequences.forEach((sequence) => {
      const rotation = sequence.observations.find((observation) => observation.event.setterPosition ?? observation.event.metadata?.rotation)?.event.setterPosition ?? sequence.observations.find((observation) => observation.event.metadata?.rotation)?.event.metadata?.rotation;
      if (rotation) groups.set(rotation, [...(groups.get(rotation) ?? []), sequence]);
    });
    const findings = [...groups.entries()].map(([rotation, items]) => {
      const wins = items.filter((item) => item.terminal?.stateId === 'terminal_win').length;
      return {
        findingId: `rotation-${rotation}`,
        label: `rotação ${rotation}`,
        numbers: { rotation, n: items.length, wins, losses: items.length - wins, pointProbability: items.length ? wins / items.length : null },
        sample: sample([], items.length, 'rally'),
        filters,
        available: items.length >= 5,
        caveats: caveatsFor(items.length, items.length >= 5),
      };
    }).sort((left, right) => (right.numbers.pointProbability ?? -Infinity) - (left.numbers.pointProbability ?? -Infinity)).slice(0, 5);
    return answer('context', findings, 'rally');
  }

  private receptionGradeAnswer(
    sequences: readonly RallySequence[],
    filters: TacticalQuestionFilters,
    answer: (type: TacticalQuestionAnswerType, findings: readonly TacticalQuestionFinding[], unit: 'rally' | 'event', reason?: TacticalQuestionAnswer['reasonUnavailable']) => TacticalQuestionAnswer,
  ): TacticalQuestionAnswer {
    const groups = new Map<string, RallySequence[]>();
    sequences.forEach((sequence) => {
      const reception = observationFor(sequence, (observation) => observation.event.skill === 'reception');
      const grade = reception ? tacticalValue.receptionGrade(reception.event.metadata) : undefined;
      if (grade) groups.set(grade, [...(groups.get(grade) ?? []), sequence]);
    });
    const findings = [...groups.entries()].map(([grade, items]) => {
      const wins = items.filter((item) => item.terminal?.stateId === 'terminal_win').length;
      return { findingId: `reception-grade-${grade}`, label: `recepção ${grade}`, numbers: { n: items.length, wins, losses: items.length - wins, pointProbability: items.length ? wins / items.length : null }, sample: sample([], items.length, 'rally'), filters, available: items.length >= 5, caveats: caveatsFor(items.length, items.length >= 5) };
    });
    return answer('context', findings, 'rally');
  }

  private phaseAnswer(
    sequences: readonly RallySequence[],
    filters: TacticalQuestionFilters,
    answer: (type: TacticalQuestionAnswerType, findings: readonly TacticalQuestionFinding[], unit: 'rally' | 'event', reason?: TacticalQuestionAnswer['reasonUnavailable']) => TacticalQuestionAnswer,
  ): TacticalQuestionAnswer {
    const findings = (['sideout', 'breakpoint'] as const).flatMap((phase) => {
      const scoped = sequences.filter((sequence) => sequence.observations.some((observation) => (observation.event.metadata?.phase ?? observation.event.metadata?.tactical?.phase) === phase));
      return this.patterns.analyze(scoped, filters.teamId, 2).slice(0, 5).map((item) => ({ ...patternFinding(item, { ...filters, phase }, scoped.length), findingId: `${phase}-${item.pattern.join('-')}`, label: `${phase}: ${item.pattern.join(' -> ')}` }));
    });
    return answer('pattern', findings, 'rally');
  }
}
