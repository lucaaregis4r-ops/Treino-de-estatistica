import type { RallySequence } from '../sequence/RallySequenceBuilder';
import type { SequenceStateId } from '../sequence/SequenceState';

export const MIN_RANKING_SAMPLE = 5;

export interface StateValueFinding {
  readonly stateId: SequenceStateId;
  readonly sampleUnit: 'rally';
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly pointProbability: number | null;
  readonly available: boolean;
  readonly warning?: 'small_sample';
}

function completeForTeam(sequences: readonly RallySequence[], teamId: string) {
  return sequences.filter(
    (sequence) => sequence.referenceTeamId === teamId && sequence.terminal !== undefined,
  );
}

function observationStates(sequence: RallySequence): readonly SequenceStateId[] {
  return sequence.terminal ? sequence.states.slice(0, -1) : sequence.states;
}

export function stateValues(
  sequences: readonly RallySequence[],
  teamId: string,
): readonly StateValueFinding[] {
  const complete = completeForTeam(sequences, teamId);
  const states = new Set<SequenceStateId>();
  complete.forEach((sequence) => observationStates(sequence).forEach((state) => states.add(state)));
  return Object.freeze(
    [...states].map((stateId) => {
      const containing = complete.filter((sequence) => observationStates(sequence).includes(stateId));
      const wins = containing.filter((sequence) => sequence.terminal?.stateId === 'terminal_win').length;
      const n = containing.length;
      return {
        stateId,
        sampleUnit: 'rally' as const,
        n,
        wins,
        losses: n - wins,
        pointProbability: n ? wins / n : null,
        available: n >= MIN_RANKING_SAMPLE,
        ...(n > 0 && n < MIN_RANKING_SAMPLE ? { warning: 'small_sample' as const } : {}),
      };
    }),
  );
}

export function statePointProbability(
  values: readonly StateValueFinding[],
  stateId: SequenceStateId,
): number | null {
  return values.find((value) => value.stateId === stateId)?.pointProbability ?? null;
}
