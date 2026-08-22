export class ValidationError extends Error {
  readonly name = 'ValidationError';

  constructor(
    message: string,
    readonly issues: readonly {
      readonly code: string;
      readonly message: string;
      readonly path?: string;
    }[],
  ) {
    super(message);
  }
}
