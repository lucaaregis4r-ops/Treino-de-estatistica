import { ParseError } from '../../../core/errors/ParseError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { Token } from '../tokenizer/Token';
import type { ParsedScoutCode } from './ParsedScoutCode';

export class Parser {
  parse(tokens: readonly Token[]): Result<ParsedScoutCode, ParseError> {
    const player = tokens.find((token) => token.type === 'PLAYER');
    const skill = tokens.find((token) => token.type === 'SKILL');
    const evaluation = tokens.find((token) => token.type === 'EVALUATION');

    if (!player || !skill || !evaluation) {
      return failure(
        new ParseError('missing_token', 'Player, skill, and evaluation are required.'),
      );
    }

    const playerNumber = Number(player.value);
    if (!Number.isSafeInteger(playerNumber) || playerNumber < 1 || playerNumber > 99) {
      return failure(
        new ParseError(
          'invalid_player',
          'Player number must be between 1 and 99.',
          player.position,
        ),
      );
    }

    return success({
      playerNumber,
      skillCode: skill.value,
      evaluationCode: evaluation.value,
    });
  }
}
