export type ParseErrorCode =
  | 'empty_input'
  | 'unsupported_grammar_field'
  | 'unexpected_token'
  | 'unknown_skill'
  | 'unknown_team'
  | 'unknown_evaluation'
  | 'invalid_player'
  | 'missing_token'
  | 'trailing_input'
  | 'semantic_mapping_failed'
  | 'tactical_input_not_configured'
  | 'unknown_tactical_token'
  | 'missing_tactical_value'
  | 'unknown_tactical_zone'
  | 'invalid_blockers_count';

export class ParseError extends Error {
  readonly name = 'ParseError';

  constructor(
    readonly code: ParseErrorCode,
    message: string,
    readonly position?: number,
  ) {
    super(message);
  }
}
