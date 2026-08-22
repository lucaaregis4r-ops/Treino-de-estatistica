export class ImportError extends Error {
  readonly name = 'ImportError';

  constructor(
    readonly code: 'invalid_json' | 'invalid_schema',
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}
