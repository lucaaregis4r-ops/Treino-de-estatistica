import type { SequenceAnalytics } from '../analytics/SequenceAnalyticsService';
import type { ZoneSystemProfile } from '../../domain/scout/tactical/ZoneSystemProfile';

export const DERIVED_ANALYTICS_METHOD_VERSION = 'scout-trainer-0.45-m6.1';

export interface DerivedAnalyticsReport {
  readonly methodVersion: typeof DERIVED_ANALYTICS_METHOD_VERSION;
  readonly sport: 'volleyball';
  readonly filters: Readonly<Record<string, string | number | undefined>>;
  readonly sample: { readonly n: number; readonly unit: 'rally' | 'event' };
  readonly coordinateSystem: { readonly zoneSystemId: string; readonly zoneSystemVersion: string; readonly resolution: number };
  readonly smoothing: { readonly method: 'none'; readonly parameter: null };
  readonly teams: readonly {
    readonly teamId: string;
    readonly rallies: { readonly total: number; readonly complete: number; readonly incomplete: number };
    readonly transitions: SequenceAnalytics['teams'][number]['markov']['transitions'];
    readonly stateValues: SequenceAnalytics['teams'][number]['markov']['stateValues'];
    readonly patterns: SequenceAnalytics['teams'][number]['patterns'];
    readonly spatial: SequenceAnalytics['teams'][number]['spatial'];
  }[];
}

/** Removes sequence/event copies while retaining auditable aggregate findings. */
export function buildDerivedAnalyticsReport(
  analytics: SequenceAnalytics,
  zoneSystem: ZoneSystemProfile,
  resolution = 6,
): DerivedAnalyticsReport {
  return {
    methodVersion: DERIVED_ANALYTICS_METHOD_VERSION,
    sport: 'volleyball',
    filters: {},
    sample: { n: analytics.teams.reduce((sum, team) => sum + team.sequences.length, 0), unit: 'rally' },
    coordinateSystem: { zoneSystemId: zoneSystem.id, zoneSystemVersion: zoneSystem.version, resolution },
    smoothing: { method: 'none', parameter: null },
    teams: analytics.teams.map((team) => ({
      teamId: team.teamId,
      rallies: {
        total: team.sequences.length,
        complete: team.sequences.filter((sequence) => sequence.status === 'complete').length,
        incomplete: team.sequences.filter((sequence) => sequence.status !== 'complete').length,
      },
      transitions: team.markov.transitions,
      stateValues: team.markov.stateValues,
      patterns: team.patterns,
      spatial: team.spatial,
    })),
  };
}
