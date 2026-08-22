import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';
import type { Profile, ProfileKind } from '../../../profiles/types';

export interface ProfileRepository {
  save(profile: Profile): Promise<Result<void, RepositoryError>>;
  find(
    kind: ProfileKind,
    id: string,
    version: string,
  ): Promise<Result<Profile | undefined, RepositoryError>>;
  list(kind: ProfileKind): Promise<Result<readonly Profile[], RepositoryError>>;
}
