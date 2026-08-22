import type { MetricResult } from '../../domain/statistics/metrics/MetricResult';

export type TacticalMetricGroup = 'serve' | 'reception' | 'attack' | 'setter' | 'rally';
export type TacticalVisualization = 'zone-matrix' | 'direction-map' | 'distribution-table';

export interface TacticalAnalyticsRowViewModel {
  readonly key: string;
  readonly label: string;
  readonly displayValue: string;
  readonly value: number | null;
  readonly audit: string;
}

export interface TacticalMetricViewModel {
  readonly id: string;
  readonly label: string;
  readonly group: TacticalMetricGroup;
  readonly visualization: TacticalVisualization;
  readonly rows: readonly TacticalAnalyticsRowViewModel[];
}

export interface TacticalTeamViewModel {
  readonly teamId: string;
  readonly teamName: string;
  readonly metrics: readonly TacticalMetricViewModel[];
}

export interface TacticalAnalyticsViewModel {
  readonly teams: readonly TacticalTeamViewModel[];
}

const LABELS: Readonly<Record<string, string>> = {
  'tactical.serve.origin_distribution': 'Origem do saque',
  'tactical.serve.target_distribution': 'Destino do saque',
  'tactical.serve.direction_distribution': 'Direção do saque',
  'tactical.serve.impact_reception': 'Impacto na recepção',
  'tactical.reception.quality_by_zone': 'Qualidade por zona',
  'tactical.reception.quality_by_rotation': 'Qualidade por rotação',
  'tactical.attack.origin_distribution': 'Origem do ataque',
  'tactical.attack.target_distribution': 'Destino do ataque',
  'tactical.attack.direction_distribution': 'Direção do ataque',
  'tactical.attack.efficiency_by_direction': 'Eficiência por direção',
  'tactical.attack.efficiency_by_type': 'Eficiência por tipo',
  'tactical.attack.efficiency_by_combination': 'Eficiência por combinação',
  'tactical.attack.by_rotation': 'Ataques por rotação',
  'tactical.attack.by_reception_quality': 'Ataques por qualidade da recepção',
  'tactical.attack.by_phase': 'Ataques por fase',
  'tactical.attack.by_blockers': 'Ataques por bloqueadores',
  'tactical.setter.by_attacker': 'Distribuição por atacante',
  'tactical.setter.by_zone': 'Distribuição por zona',
  'tactical.setter.by_call': 'Distribuição por chamada',
  'tactical.setter.by_rotation': 'Distribuição por rotação',
  'tactical.setter.by_reception_quality': 'Distribuição por qualidade da recepção',
  'tactical.rally.sideout': 'Sideout',
  'tactical.rally.breakpoint': 'Breakpoint',
  'tactical.rally.transition': 'Transição',
};

function group(metricId: string): TacticalMetricGroup {
  return metricId.split('.')[1] as TacticalMetricGroup;
}

function visualization(metricId: string): TacticalVisualization {
  if (metricId.includes('direction')) return 'direction-map';
  if (metricId.includes('origin') || metricId.includes('target') || metricId.includes('zone')) {
    return 'zone-matrix';
  }
  return 'distribution-table';
}

function percentage(value: number | null): string {
  return value === null
    ? '—'
    : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function metric(result: MetricResult): TacticalMetricViewModel {
  return {
    id: result.metricId,
    label: LABELS[result.metricId] ?? result.metricId,
    group: group(result.metricId),
    visualization: visualization(result.metricId),
    rows: (result.breakdown ?? []).map((row) => ({
      key: row.key,
      label: row.label,
      displayValue: percentage(row.value),
      value: row.value,
      audit: `${row.numerator}/${row.denominator}`,
    })),
  };
}

export function buildTacticalAnalytics(
  teams: readonly { teamId: string; teamName: string; results: readonly MetricResult[] }[],
): TacticalAnalyticsViewModel {
  return {
    teams: teams.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      metrics: team.results.filter((result) => result.available).map(metric),
    })),
  };
}
