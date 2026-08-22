import type { MetricResult } from '../../domain/statistics/metrics/MetricResult';

export interface DashboardMetricViewModel {
  readonly id: string;
  readonly label: string;
  readonly displayValue: string;
  readonly available: boolean;
}

export interface TeamStatisticsViewModel {
  readonly teamId: string;
  readonly teamName: string;
  readonly metrics: readonly DashboardMetricViewModel[];
}

export interface StatisticsDashboardViewModel {
  readonly teams: readonly TeamStatisticsViewModel[];
}

const PRESENTATION: Readonly<Record<string, { label: string; percentage?: boolean }>> = {
  'volleyball.attack.volume': { label: 'Ataques' },
  'volleyball.attack.points': { label: 'Pontos de ataque' },
  'volleyball.attack.efficiency': { label: 'Eficiência de ataque', percentage: true },
  'volleyball.serve.aces': { label: 'Aces' },
  'volleyball.reception.positive': { label: 'Recepção positiva', percentage: true },
  'volleyball.block.points': { label: 'Pontos de bloqueio' },
  'cbv.2025_26.attack': { label: 'Ataque CBV', percentage: true },
  'cbv.2025_26.attack_efficiency': { label: 'Eficiência de ataque CBV', percentage: true },
  'cbv.2025_26.serve': { label: 'Pontos de saque CBV' },
  'cbv.2025_26.serve_efficiency': { label: 'Eficiência de saque CBV', percentage: true },
  'cbv.2025_26.block': { label: 'Pontos de bloqueio CBV' },
  'cbv.2025_26.block_efficiency': { label: 'Bloqueios por set' },
  'cbv.2025_26.pass_efficiency': { label: 'Eficiência de passe CBV', percentage: true },
  'cbv.2025_26.top_scorer': { label: 'Pontos totais CBV' },
};

function display(result: MetricResult, percentage = false): string {
  if (!result.available || result.value === null) return '—';
  if (percentage) {
    return `${(result.value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
  return result.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function buildStatisticsDashboard(
  teams: readonly { teamId: string; teamName: string; results: readonly MetricResult[] }[],
): StatisticsDashboardViewModel {
  return {
    teams: teams.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      metrics: team.results.map((result) => {
        const presentation = PRESENTATION[result.metricId] ?? { label: result.metricId };
        return {
          id: result.metricId,
          label: presentation.label,
          displayValue: display(result, presentation.percentage),
          available: result.available,
        };
      }),
    })),
  };
}
