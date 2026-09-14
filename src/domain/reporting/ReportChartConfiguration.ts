export const REPORT_CHART_CONFIGURATION_SCHEMA_VERSION = 1;

export type ReportChartType =
  | 'win_probability'
  | 'team_performance'
  | 'rotation_performance'
  | 'setter_distribution'
  | 'attack_evenness'
  | 'setter_repetition';

export interface ReportChartFilters {
  readonly teamId?: string;
  readonly playerId?: string;
  readonly setterPosition?: number;
}

export interface ReportChartSample {
  readonly totalActions: number;
  readonly identifiedActions: number;
  readonly unidentifiedActions: number;
}

export interface ReportChartCoverage {
  readonly modes: readonly string[];
  readonly identifiedActions: number;
  readonly unidentifiedActions: number;
}

export interface ReportChartConfiguration {
  readonly id: string;
  readonly matchId: string;
  readonly schemaVersion: number;
  readonly type: ReportChartType;
  readonly title: string;
  readonly filters: ReportChartFilters;
  readonly parameters: Readonly<Record<string, string | number | boolean | null>>;
  readonly order: number;
  readonly sample: ReportChartSample;
  readonly coverage?: ReportChartCoverage;
}

export function createReportChartConfiguration(input: {
  readonly id: string;
  readonly matchId: string;
  readonly type: ReportChartType;
  readonly title: string;
  readonly filters: ReportChartFilters;
  readonly parameters?: Readonly<Record<string, string | number | boolean | null>>;
  readonly order: number;
  readonly sample: ReportChartSample;
  readonly coverage?: ReportChartCoverage;
}): ReportChartConfiguration {
  return Object.freeze({
    ...input,
    schemaVersion: REPORT_CHART_CONFIGURATION_SCHEMA_VERSION,
    title: input.title.trim(),
    filters: Object.freeze({ ...input.filters }),
    parameters: Object.freeze({ ...(input.parameters ?? {}) }),
    sample: Object.freeze({ ...input.sample }),
    ...(input.coverage
      ? { coverage: Object.freeze({ ...input.coverage, modes: Object.freeze([...input.coverage.modes]) }) }
      : {}),
  });
}
