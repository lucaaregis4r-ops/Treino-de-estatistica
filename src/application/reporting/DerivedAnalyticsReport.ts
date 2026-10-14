import { buildRallyPathModel, type PathModelTransition } from '../../domain/analytics/markov/RallyPathAnalyzer';
import type { SequenceAnalytics } from '../analytics/SequenceAnalyticsService';
import type { ZoneSystemProfile } from '../../domain/scout/tactical/ZoneSystemProfile';

export const DERIVED_ANALYTICS_METHOD_VERSION = 'scout-trainer-0.6-s3-exchange-spatial';

export interface DerivedAnalyticsReport {
  readonly methodVersion: typeof DERIVED_ANALYTICS_METHOD_VERSION;
  readonly sport: 'volleyball';
  readonly filters: Readonly<Record<string, string | number | undefined>>;
  readonly sample: { readonly n: number; readonly unit: 'rally' | 'event' };
  readonly coordinateSystem: { readonly zoneSystemId: string; readonly zoneSystemVersion: string; readonly resolution: number };
  readonly smoothing: { readonly method: 'none'; readonly parameter: null };
  readonly teams: readonly {
    readonly teamId: string;
    /** Current model; legacy skill-only transitions remain separately available below. */
    readonly exchangeModel: {
      readonly unit: 'exchange'; readonly spatial: 'zones';
      readonly status: 'available' | 'unavailable'; readonly eligibleRallies: number;
      readonly transitions: readonly PathModelTransition[];
      readonly values: Readonly<Record<string, number | null>>;
    };
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
    sample: { n: new Set(analytics.teams.flatMap(team => team.sequences.map(sequence => sequence.rallyId))).size, unit: 'rally' },
    coordinateSystem: { zoneSystemId: zoneSystem.id, zoneSystemVersion: zoneSystem.version, resolution },
    smoothing: { method: 'none', parameter: null },
    teams: analytics.teams.map((team) => ({
      teamId: team.teamId,
      exchangeModel: (() => {
        const model = buildRallyPathModel(analytics.pathRallies ?? team.pathRallies ?? [], team.teamId);
        return { unit: 'exchange' as const, spatial: 'zones' as const, status: model.status,
          eligibleRallies: model.eligibleRallies.length, transitions: model.transitions, values: model.values };
      })(),
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
