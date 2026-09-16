import type { Team } from '../../domain/match/entities/Team';
import type { MatchEvent } from '../../domain/match/events/MatchEvent';
import { projectEffectiveMatchEvents } from '../../domain/match/events/ScoutTimeline';
import type { TacticalRallyProjection } from '../../domain/rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';
import type { ZoneSystemProfile } from '../../domain/scout/tactical/ZoneSystemProfile';
import {
  MarkovAnalyzer,
  SequencePatternAnalyzer,
  SpatialMarkovAnalyzer,
  type MarkovAnalysis,
  type SpatialMarkovAnalysis,
  type SequencePatternFinding,
  buildRallyPathRallies,
  type RallyPathInput,
  type RallyPathRally,
} from '../../domain/analytics/markov';
import { buildRallySequences, type RallySequence } from '../../domain/analytics/sequence';

export interface TeamSequenceAnalytics {
  readonly teamId: string;
  readonly sequences: readonly RallySequence[];
  readonly markov: MarkovAnalysis;
  readonly patterns: Readonly<{
    readonly 2: readonly SequencePatternFinding[];
    readonly 3: readonly SequencePatternFinding[];
  }>;
  readonly spatial: Readonly<Record<string, SpatialMarkovAnalysis>>;
  /** Real, completed and incomplete rallies used by Caminhos do rally. */
  readonly pathRallies?: readonly RallyPathRally[];
}

export interface SequenceAnalytics {
  readonly teams: readonly TeamSequenceAnalytics[];
  readonly pathRallies?: readonly RallyPathRally[];
  readonly zoneSystem?: ZoneSystemProfile;
}

/** Builds the M2 projections on demand; it deliberately has no persistence boundary. */
export class SequenceAnalyticsService {
  private readonly cache = new Map<string, SequenceAnalytics>();

  constructor(
    private readonly markov = new MarkovAnalyzer(),
    private readonly patterns = new SequencePatternAnalyzer(),
    private readonly spatial = new SpatialMarkovAnalyzer(),
  ) {}

  build(
    events: RallyPathInput,
    teams: readonly [Team, Team],
    tacticalRally: TacticalRallyProjection,
    zoneSystem: ZoneSystemProfile,
  ): SequenceAnalytics {
    const cacheKey = [
      zoneSystem.id,
      zoneSystem.version,
      ...teams.map((team) => team.id),
      ...tacticalRally.rallies.map(
        (rally) => `${rally.rallyId}:${rally.winnerTeamId ?? ''}:${rally.servingTeamId ?? ''}`,
      ),
      ...events.map((event) =>
        'type' in event
          ? `${event.type}:${event.type === 'scout_registered' ? `${event.event.id}:${event.event.sequence}:${event.event.timestamp}:${event.event.evaluation ?? ''}:${event.event.outcome ?? ''}` : `${event.id}:${event.sequence}:${event.timestamp}`}`
          : `${event.id}:${event.sequence}:${event.timestamp}:${event.evaluation ?? ''}:${event.outcome ?? ''}`,
      ),
    ].join('|');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const scoutEvents: readonly ScoutEvent[] =
      events.length > 0 && 'type' in events[0]
        ? projectEffectiveMatchEvents(events as readonly MatchEvent[]).flatMap((event) =>
            event.type === 'scout_registered' ? [event.event] : [],
          )
        : (events as readonly ScoutEvent[]);
    const pathRallies = buildRallyPathRallies(events, tacticalRally, zoneSystem);
    const result = Object.freeze({
      pathRallies: pathRallies.rallies,
      zoneSystem,
      teams: Object.freeze(
        teams.map((team) => {
          const sequences = buildRallySequences(scoutEvents, {
            zoneSystem,
            tacticalRally,
            referenceTeamId: team.id,
          });
          const spatial = Object.fromEntries(
            ['serve', 'reception', 'attack', 'block', 'dig', 'free_ball'].map((skill) => [
              skill,
              this.spatial.analyze(sequences, team.id, skill),
            ]),
          );
          return Object.freeze({
            teamId: team.id,
            sequences,
            markov: this.markov.analyze(sequences, team.id),
            patterns: Object.freeze({
              2: this.patterns.analyze(sequences, team.id, 2),
              3: this.patterns.analyze(sequences, team.id, 3),
            }),
            spatial: Object.freeze(spatial),
            pathRallies: pathRallies.rallies,
          });
        }),
      ),
    });
    this.cache.set(cacheKey, result);
    return result;
  }
}
