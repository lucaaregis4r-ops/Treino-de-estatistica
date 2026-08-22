export type ProfileErrorCode = 'invalid_profile' | 'duplicate_profile' | 'profile_not_found';

export class ProfileError extends Error {
  readonly name = 'ProfileError';

  constructor(
    readonly code: ProfileErrorCode,
    message: string,
    readonly issues: readonly {
      readonly code: string;
      readonly message: string;
      readonly path?: string;
    }[] = [],
  ) {
    super(message);
  }
}
