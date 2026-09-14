import type { Skill } from '../scout/entities/Skill';

export const ANALYSIS_CONFIGURATION_SCHEMA_VERSION = 1;

export type AnalysisCoordinate = 'origin' | 'target';
export type AnalysisViewMode = 'points' | 'plays' | 'heatmap';

export interface AnalysisConfigurationFilters {
  readonly teamId: string;
  readonly skill: Skill | 'all';
  readonly evaluations: readonly string[] | null;
  readonly playerId: string;
  readonly setNumber: string;
  readonly rotation: string;
  readonly coordinate: AnalysisCoordinate;
  readonly origin?: string;
  readonly destination?: string;
}

export interface AnalysisConfigurationChart {
  readonly viewMode: AnalysisViewMode;
  readonly radius: number;
  readonly intensity: number;
}

export interface AnalysisConfiguration {
  readonly id: string;
  readonly matchId: string;
  readonly schemaVersion: number;
  readonly name: string;
  readonly updatedAt: number;
  readonly filters: AnalysisConfigurationFilters;
  readonly chart: AnalysisConfigurationChart;
}

export function createAnalysisConfiguration(input: {
  readonly id: string;
  readonly matchId: string;
  readonly name: string;
  readonly updatedAt: number;
  readonly filters: AnalysisConfigurationFilters;
  readonly chart: AnalysisConfigurationChart;
}): AnalysisConfiguration {
  return Object.freeze({
    ...input,
    name: input.name.trim(),
    schemaVersion: ANALYSIS_CONFIGURATION_SCHEMA_VERSION,
    filters: Object.freeze({
      ...input.filters,
      evaluations: input.filters.evaluations ? Object.freeze([...input.filters.evaluations]) : null,
    }),
    chart: Object.freeze({ ...input.chart }),
  });
}
