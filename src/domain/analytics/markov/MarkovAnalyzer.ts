import type { RallySequence } from '../sequence/RallySequenceBuilder';
import type { SequenceStateId } from '../sequence/SequenceState';
import { buildTransitionMatrix, transitionProbability, type TransitionMatrix } from './TransitionMatrix';
import { statePointProbability, stateValues, type StateValueFinding } from './StateValue';

export interface TransitionFinding {
  readonly id: string;
  readonly from: SequenceStateId;
  readonly to: SequenceStateId;
  readonly count: number;
  readonly probability: number | null;
  readonly fromStatePointProbability: number | null;
  readonly toStatePointProbability: number | null;
  readonly deltaPointProbability: number | null;
  readonly sampleSize: number;
  readonly available: boolean;
  readonly warning?: 'small_sample';
}

export interface MarkovAnalysis {
  readonly teamId: string;
  readonly matrix: TransitionMatrix;
  readonly stateValues: readonly StateValueFinding[];
  readonly transitions: readonly TransitionFinding[];
}

export class MarkovAnalyzer {
  analyze(sequences: readonly RallySequence[], teamId: string): MarkovAnalysis {
    const matrix = buildTransitionMatrix(sequences, teamId);
    const values = stateValues(sequences, teamId);
    return Object.freeze({
      teamId,
      matrix,
      stateValues: values,
      transitions: Object.freeze(
        matrix.counts.map((item) => {
          const fromValue = statePointProbability(values, item.from);
          const toValue = statePointProbability(values, item.to);
          const delta = fromValue === null || toValue === null ? null : toValue - fromValue;
          return {
            id: `${item.from}->${item.to}`,
            ...item,
            probability: transitionProbability(matrix, item.from, item.to),
            fromStatePointProbability: fromValue,
            toStatePointProbability: toValue,
            deltaPointProbability: delta,
            sampleSize: matrix.sampleSize,
            available: item.count >= 5,
            ...(item.count > 0 && item.count < 5 ? { warning: 'small_sample' as const } : {}),
          };
        }),
      ),
    });
  }
}
