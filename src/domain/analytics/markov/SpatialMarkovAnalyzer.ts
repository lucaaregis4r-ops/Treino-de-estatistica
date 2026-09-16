import type { RallySequence } from '../sequence/RallySequenceBuilder';
import { SpatialValueEstimator, type SpatialRole, type SpatialRegionFinding, type SpatialValueCell } from './SpatialValueEstimator';

export interface SpatialMarkovAnalysis {
  readonly teamId: string;
  readonly skill: string;
  readonly regions: readonly SpatialRegionFinding[];
  readonly cells: readonly SpatialValueCell[];
  readonly sampleUnit: 'event';
}

export class SpatialMarkovAnalyzer {
  constructor(private readonly estimator = new SpatialValueEstimator()) {}

  analyze(
    sequences: readonly RallySequence[],
    teamId: string,
    skill: string,
    spatialRole?: Exclude<SpatialRole, 'trajectory'>,
    gridSize = 6,
  ): SpatialMarkovAnalysis {
    const regions = this.estimator.regions(sequences, teamId, skill);
    const role = spatialRole ?? (skill === 'attack' ? 'target' : 'target');
    return Object.freeze({
      teamId,
      skill,
      regions,
      cells: this.estimator.cells(sequences, teamId, skill, role, gridSize),
      sampleUnit: 'event' as const,
    });
  }
}
