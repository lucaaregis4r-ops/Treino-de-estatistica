export type RepositoryErrorCode =
  | 'database_open_failed'
  | 'database_operation_failed'
  | 'duplicate_event_sequence'
  | 'entity_not_found';

export class RepositoryError extends Error {
  readonly name = 'RepositoryError';

  constructor(
    readonly code: RepositoryErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}
