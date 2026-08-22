import type { CanonicalScoutEventCandidate } from '../../scout/mapper/CanonicalScoutEventCandidate';
import type { TrainingError } from '../attempts/TrainingAttempt';

export interface TrainingComparison {
  readonly correct: boolean;
  readonly errors: readonly TrainingError[];
}

export class TrainingComparator {
  compareSequence(
    expected: readonly CanonicalScoutEventCandidate[],
    received: readonly CanonicalScoutEventCandidate[],
  ): TrainingComparison {
    const errors: TrainingError[] = [];
    const length = Math.max(expected.length, received.length);
    for (let index = 0; index < length; index += 1) {
      const expectedEvent = expected[index];
      const receivedEvent = received[index];
      if (!expectedEvent || !receivedEvent) {
        errors.push({
          type: 'syntax',
          code: 'wrong_sequence_length',
          message: `O rally esperado possui ${expected.length} contatos.`,
        });
        continue;
      }
      errors.push(
        ...this.compare(expectedEvent, receivedEvent).errors.map((error) => ({
          ...error,
          code: `contact_${index + 1}_${error.code}`,
          message: `Contato ${index + 1}: ${error.message}`,
        })),
      );
    }
    return { correct: errors.length === 0, errors };
  }

  compare(
    expected: CanonicalScoutEventCandidate,
    received?: CanonicalScoutEventCandidate,
    syntaxError?: { code: string; message: string },
  ): TrainingComparison {
    if (syntaxError) {
      return { correct: false, errors: [{ type: 'syntax', ...syntaxError }] };
    }
    if (!received) {
      return {
        correct: false,
        errors: [
          {
            type: 'syntax',
            code: 'unreadable_input',
            message: 'A entrada não pôde ser interpretada.',
          },
        ],
      };
    }
    const errors: TrainingError[] = [];
    if (expected.playerNumber !== received.playerNumber)
      errors.push({
        type: 'player',
        code: 'wrong_player',
        message: `Jogador esperado: ${expected.playerNumber}.`,
      });
    if (expected.skill !== received.skill)
      errors.push({
        type: 'skill',
        code: 'wrong_skill',
        message: `Fundamento esperado: ${expected.skill}.`,
      });
    if (expected.evaluation !== received.evaluation)
      errors.push({
        type: 'evaluation',
        code: 'wrong_evaluation',
        message: `Avaliação esperada: ${expected.evaluation}.`,
      });
    return { correct: errors.length === 0, errors };
  }
}
