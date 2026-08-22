import { ParseError } from '../../../core/errors/ParseError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { CodeProfile, ScoutField } from '../../../profiles/types';
import type { NormalizedScoutInput } from '../entities/RawScoutInput';
import type { Token } from './Token';

function longestMatch(
  input: string,
  position: number,
  values: readonly string[],
): string | undefined {
  return [...values]
    .sort((left, right) => right.length - left.length)
    .find((value) => input.startsWith(value, position));
}

export class Tokenizer {
  tokenize(
    input: NormalizedScoutInput,
    profile: CodeProfile,
  ): Result<readonly Token[], ParseError> {
    if (input.normalizedCode.length === 0) {
      return failure(new ParseError('empty_input', 'Scout code cannot be empty.', 0));
    }

    const tokens: Token[] = [];
    let position = 0;

    for (const field of profile.grammar) {
      const token = this.readField(field, input.normalizedCode, position, profile);
      if (!token.ok) return token;
      tokens.push(token.value);
      position += token.value.value.length;
    }

    if (position !== input.normalizedCode.length) {
      return failure(
        new ParseError('trailing_input', `Unexpected input at position ${position}.`, position),
      );
    }

    return success(tokens);
  }

  private readField(
    field: ScoutField,
    input: string,
    position: number,
    profile: CodeProfile,
  ): Result<Token, ParseError> {
    if (position >= input.length) {
      return failure(new ParseError('missing_token', `Missing ${field} token.`, position));
    }

    if (field === 'player') {
      const value = input.slice(position, position + 2);
      if (!/^\d{2}$/.test(value)) {
        return failure(new ParseError('invalid_player', 'Player must use two digits.', position));
      }
      return success({ type: 'PLAYER', value, position });
    }

    if (field === 'team') {
      const value = longestMatch(input, position, Object.values(profile.teamCodes ?? {}));
      return value
        ? success({ type: 'TEAM', value, position })
        : failure(new ParseError('unknown_team', 'Unknown team code.', position));
    }

    if (field === 'skill') {
      const value = longestMatch(input, position, Object.keys(profile.skills));
      return value
        ? success({ type: 'SKILL', value, position })
        : failure(new ParseError('unknown_skill', 'Unknown skill code.', position));
    }

    if (field === 'evaluation') {
      const value = longestMatch(input, position, Object.keys(profile.evaluations));
      return value
        ? success({ type: 'EVALUATION', value, position })
        : failure(new ParseError('unknown_evaluation', 'Unknown evaluation code.', position));
    }

    return failure(
      new ParseError(
        'unsupported_grammar_field',
        `Grammar field ${field} is not supported by the current tokenizer.`,
        position,
      ),
    );
  }
}
