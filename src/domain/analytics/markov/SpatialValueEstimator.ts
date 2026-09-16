import type { RallySequence, SequenceObservation } from '../sequence/RallySequenceBuilder';
import type { SpatialCoordinate } from '../sequence/SpatialContext';
import { MIN_RANKING_SAMPLE } from './StateValue';

export type SpatialRole = 'origin' | 'target' | 'trajectory';

export interface SpatialRegionFinding {
  readonly findingId: string;
  readonly skill: string;
  readonly spatialRole: SpatialRole;
  readonly regionId?: string;
  readonly originRegionId?: string;
  readonly targetRegionId?: string;
  readonly sampleUnit: 'event';
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly empiricalPointProbability: number | null;
  readonly baselinePointProbability: number | null;
  readonly deltaVsBaseline: number | null;
  readonly available: boolean;
  readonly warning?: 'small_sample';
}

export interface SpatialValueCell {
  readonly cellId: string;
  readonly spatialRole: Exclude<SpatialRole, 'trajectory'>;
  readonly skill: string;
  readonly bounds: { readonly xMin: number; readonly xMax: number; readonly yMin: number; readonly yMax: number };
  readonly center: { readonly x: number; readonly y: number };
  readonly sampleUnit: 'event';
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly empiricalPointProbability: number | null;
  readonly baselinePointProbability: number | null;
  readonly deltaVsBaseline: number | null;
  readonly available: boolean;
  readonly warning?: 'small_sample';
}

interface SpatialObservation {
  readonly sequence: RallySequence;
  readonly observation: SequenceObservation;
  readonly coordinate?: SpatialCoordinate;
  readonly regionId?: string;
  readonly originRegionId?: string;
  readonly targetRegionId?: string;
}

function observationsFor(
  sequences: readonly RallySequence[],
  teamId: string,
  skill: string,
  role: SpatialRole,
): readonly SpatialObservation[] {
  return sequences
    .filter((sequence) => sequence.referenceTeamId === teamId && sequence.terminal !== undefined)
    .flatMap((sequence) =>
      sequence.observations.flatMap<SpatialObservation>((observation): readonly SpatialObservation[] => {
        if (observation.event.skill !== skill || observation.event.teamId !== teamId) return [];
        const { spatial } = observation;
        if (role === 'origin' && spatial.origin) {
          return [{ sequence, observation, coordinate: spatial.origin, regionId: spatial.originRegionId }];
        }
        if (role === 'target' && spatial.target) {
          return [{ sequence, observation, coordinate: spatial.target, regionId: spatial.targetRegionId }];
        }
        if (
          role === 'trajectory' &&
          spatial.origin &&
          spatial.target &&
          spatial.originRegionId &&
          spatial.targetRegionId
        ) {
          return [{
            sequence,
            observation,
            coordinate: spatial.target,
            originRegionId: spatial.originRegionId,
            targetRegionId: spatial.targetRegionId,
          }];
        }
        return [];
      }),
    );
}

function allSkillObservations(
  sequences: readonly RallySequence[],
  teamId: string,
  skill: string,
): readonly SpatialObservation[] {
  return sequences
    .filter((sequence) => sequence.referenceTeamId === teamId && sequence.terminal !== undefined)
    .flatMap((sequence) =>
      sequence.observations
        .filter((observation) => observation.event.skill === skill && observation.event.teamId === teamId)
        .map((observation) => ({ sequence, observation })),
    );
}

function finding(
  findingId: string,
  skill: string,
  spatialRole: SpatialRole,
  observations: readonly SpatialObservation[],
  baseline: { readonly wins: number; readonly n: number },
  dimensions: Partial<Pick<SpatialRegionFinding, 'regionId' | 'originRegionId' | 'targetRegionId'>>,
): SpatialRegionFinding {
  const wins = observations.filter((item) => item.sequence.terminal?.stateId === 'terminal_win').length;
  const n = observations.length;
  const empiricalPointProbability = n ? wins / n : null;
  const baselinePointProbability = baseline.n ? baseline.wins / baseline.n : null;
  return {
    findingId,
    skill,
    spatialRole,
    ...dimensions,
    sampleUnit: 'event',
    n,
    wins,
    losses: n - wins,
    empiricalPointProbability,
    baselinePointProbability,
    deltaVsBaseline:
      empiricalPointProbability === null || baselinePointProbability === null
        ? null
        : empiricalPointProbability - baselinePointProbability,
    available: n >= MIN_RANKING_SAMPLE,
    ...(n > 0 && n < MIN_RANKING_SAMPLE ? { warning: 'small_sample' } : {}),
  };
}

export class SpatialValueEstimator {
  regions(
    sequences: readonly RallySequence[],
    teamId: string,
    skill: string,
  ): readonly SpatialRegionFinding[] {
    const roles: readonly SpatialRole[] = skill === 'attack' ? ['origin', 'target', 'trajectory'] : ['target'];
    return Object.freeze(
      roles.flatMap((spatialRole) => {
        const observations = observationsFor(sequences, teamId, skill, spatialRole);
        const baselineObservations = allSkillObservations(sequences, teamId, skill);
        const baseline = {
          n: baselineObservations.length,
          wins: baselineObservations.filter((item) => item.sequence.terminal?.stateId === 'terminal_win').length,
        };
        const grouped = new Map<string, SpatialObservation[]>();
        observations.forEach((item) => {
          const key = spatialRole === 'trajectory'
            ? `${item.originRegionId}->${item.targetRegionId}`
            : item.regionId;
          if (!key) return;
          const group = grouped.get(key) ?? [];
          group.push(item);
          grouped.set(key, group);
        });
        return [...grouped.entries()].map(([key, group]) =>
          finding(
            `${skill}-${spatialRole}-${key}`,
            skill,
            spatialRole,
            group,
            baseline,
            spatialRole === 'trajectory'
              ? { originRegionId: group[0].originRegionId, targetRegionId: group[0].targetRegionId }
              : { regionId: key },
          ),
        );
      }),
    );
  }

  cells(
    sequences: readonly RallySequence[],
    teamId: string,
    skill: string,
    spatialRole: Exclude<SpatialRole, 'trajectory'>,
    gridSize = 6,
  ): readonly SpatialValueCell[] {
    if (gridSize < 1 || !Number.isInteger(gridSize)) throw new Error('gridSize must be a positive integer');
    const observations = observationsFor(sequences, teamId, skill, spatialRole);
    const baseline = {
      n: observations.length,
      wins: observations.filter((item) => item.sequence.terminal?.stateId === 'terminal_win').length,
    };
    const groups = new Map<string, SpatialObservation[]>();
    observations.forEach((item) => {
      if (!item.coordinate) return;
      const x = Math.min(gridSize - 1, Math.floor(item.coordinate.x * gridSize));
      const y = Math.min(gridSize - 1, Math.floor(item.coordinate.y * gridSize));
      const key = `${x}:${y}`;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    });
    return Object.freeze(
      [...groups.entries()].map(([key, group]) => {
        const [x, y] = key.split(':').map(Number);
        const n = group.length;
        const wins = group.filter((item) => item.sequence.terminal?.stateId === 'terminal_win').length;
        const empirical = n ? wins / n : null;
        const baselineP = baseline.n ? baseline.wins / baseline.n : null;
        return {
          cellId: `${skill}-${spatialRole}-${key}`,
          spatialRole,
          skill,
          bounds: { xMin: x / gridSize, xMax: (x + 1) / gridSize, yMin: y / gridSize, yMax: (y + 1) / gridSize },
          center: { x: (x + 0.5) / gridSize, y: (y + 0.5) / gridSize },
          sampleUnit: 'event' as const,
          n,
          wins,
          losses: n - wins,
          empiricalPointProbability: empirical,
          baselinePointProbability: baselineP,
          deltaVsBaseline: empirical === null || baselineP === null ? null : empirical - baselineP,
          available: n >= MIN_RANKING_SAMPLE,
          ...(n > 0 && n < MIN_RANKING_SAMPLE ? { warning: 'small_sample' as const } : {}),
        };
      }),
    );
  }
}
