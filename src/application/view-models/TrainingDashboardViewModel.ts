import type { TrainingPerformanceMetrics } from '../../domain/training/metrics/TrainingPerformanceMetrics';

export interface TrainingDashboardViewModel {
  readonly accuracy: string;
  readonly averageTime: string;
  readonly medianTime: string;
  readonly eventsPerMinute: string;
  readonly completeness: string;
  readonly corrections: string;
  readonly correctionRate: string;
  readonly tacticalDetailRate: string;
  readonly correct: string;
  readonly errorCounts: readonly { label: string; value: number }[];
}

function time(value: number | null): string {
  return value === null
    ? '—'
    : `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
}

function percentage(value: number | null): string {
  return value === null
    ? '—'
    : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function buildTrainingDashboard(
  metrics: TrainingPerformanceMetrics,
): TrainingDashboardViewModel {
  return {
    accuracy: percentage(metrics.accuracy),
    averageTime: time(metrics.averageTimeMs),
    medianTime: time(metrics.medianTimeMs),
    eventsPerMinute:
      metrics.eventsPerMinute === null
        ? '—'
        : metrics.eventsPerMinute.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
    correct: `${metrics.correct}/${metrics.attempts}`,
    completeness: percentage(metrics.completeness),
    corrections: metrics.corrections.toLocaleString('pt-BR'),
    correctionRate: percentage(metrics.correctionRate),
    tacticalDetailRate: percentage(metrics.tacticalDetailRate),
    errorCounts: [
      { label: 'Sintaxe', value: metrics.errors.syntax },
      { label: 'Jogador', value: metrics.errors.player },
      { label: 'Fundamento', value: metrics.errors.skill },
      { label: 'Detalhes táticos', value: metrics.errors.tactical },
      { label: 'Avaliação', value: metrics.errors.evaluation },
    ],
  };
}
