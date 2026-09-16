import type { RallySequence } from '../sequence/RallySequenceBuilder';
import type { SequenceStateId } from '../sequence/SequenceState';

export interface TransitionCount {
  readonly from: SequenceStateId;
  readonly to: SequenceStateId;
  readonly count: number;
}

export interface TransitionMatrix {
  readonly teamId: string;
  readonly sampleSize: number;
  readonly counts: readonly TransitionCount[];
  readonly rowTotals: Readonly<Record<SequenceStateId, number>>;
}

export function buildTransitionMatrix(
  sequences: readonly RallySequence[],
  teamId: string,
): TransitionMatrix {
  const counts = new Map<string, TransitionCount>();
  const rowTotals = {} as Record<SequenceStateId, number>;
  let sampleSize = 0;
  sequences.filter((sequence) => sequence.referenceTeamId === teamId).forEach((sequence) => {
    sampleSize += 1;
    const states: readonly (SequenceStateId | undefined)[] = sequence.terminal
      ? sequence.states
      : [...sequence.states, undefined];
    states.slice(0, -1).forEach((from, index) => {
      const to = states[index + 1];
      if (!from || !to || from === 'terminal_win' || from === 'terminal_loss') return;
      const key = `${from}->${to}`;
      const current = counts.get(key);
      counts.set(key, { from, to, count: (current?.count ?? 0) + 1 });
      rowTotals[from] = (rowTotals[from] ?? 0) + 1;
    });
  });
  return Object.freeze({
    teamId,
    sampleSize,
    counts: Object.freeze([...counts.values()]),
    rowTotals: Object.freeze(rowTotals),
  });
}

export function transitionProbability(
  matrix: TransitionMatrix,
  from: SequenceStateId,
  to: SequenceStateId,
): number | null {
  const denominator = matrix.rowTotals[from] ?? 0;
  if (denominator === 0) return null;
  return (matrix.counts.find((item) => item.from === from && item.to === to)?.count ?? 0) / denominator;
}
