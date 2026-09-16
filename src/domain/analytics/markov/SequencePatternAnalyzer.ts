import type { RallySequence } from '../sequence/RallySequenceBuilder';
import type { SequenceStateId } from '../sequence/SequenceState';

export interface SequencePatternFinding {
  readonly pattern: readonly SequenceStateId[];
  readonly occurrences: number;
  readonly wins: number;
  readonly losses: number;
  readonly pointProbability: number | null;
  readonly liftVsBaseline: number | null;
}

export class SequencePatternAnalyzer {
  analyze(
    sequences: readonly RallySequence[],
    teamId: string,
    length: 2 | 3,
  ): readonly SequencePatternFinding[] {
    const complete = sequences.filter(
      (sequence) => sequence.referenceTeamId === teamId && sequence.terminal !== undefined,
    );
    const wins = complete.filter((sequence) => sequence.terminal?.stateId === 'terminal_win').length;
    const baseline = complete.length ? wins / complete.length : null;
    const groups = new Map<string, { pattern: SequenceStateId[]; wins: number; losses: number }>();
    complete.forEach((sequence) => {
      const states = sequence.terminal ? sequence.states.slice(0, -1) : sequence.states;
      for (let index = 0; index <= states.length - length; index += 1) {
        const pattern = states.slice(index, index + length);
        const key = pattern.join('>');
        const current = groups.get(key) ?? { pattern, wins: 0, losses: 0 };
        if (sequence.terminal?.stateId === 'terminal_win') current.wins += 1;
        else current.losses += 1;
        groups.set(key, current);
      }
    });
    return Object.freeze(
      [...groups.values()].map(({ pattern, wins: patternWins, losses }) => {
        const occurrences = patternWins + losses;
        const pointProbability = occurrences ? patternWins / occurrences : null;
        return {
          pattern: Object.freeze(pattern),
          occurrences,
          wins: patternWins,
          losses,
          pointProbability,
          liftVsBaseline:
            pointProbability === null || baseline === null ? null : pointProbability - baseline,
        };
      }),
    );
  }
}
