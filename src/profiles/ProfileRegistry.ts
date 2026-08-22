import { ProfileError } from '../core/errors/ProfileError';
import { failure, type Result, success } from '../core/result/Result';
import { ProfileValidator } from './ProfileValidator';
import type { Profile, ProfileByKind, ProfileKind } from './types';

function profileKey(id: string, version: string): string {
  return `${id}@${version}`;
}

export class ProfileRegistry {
  private readonly profiles: { [K in ProfileKind]: Map<string, ProfileByKind[K]> } = {
    code: new Map(),
    complexity: new Map(),
    competition: new Map(),
    training: new Map(),
  };

  constructor(private readonly validator = new ProfileValidator()) {}

  register<K extends ProfileKind>(
    profile: ProfileByKind[K],
  ): Result<ProfileByKind[K], ProfileError> {
    const validation = this.validator.validate(profile);
    if (!validation.valid) {
      return failure(
        new ProfileError('invalid_profile', `Profile ${profile.id} is invalid.`, validation.issues),
      );
    }

    const registry = this.profiles[profile.kind] as Map<string, ProfileByKind[K]>;
    const key = profileKey(profile.id, profile.version);
    if (registry.has(key)) {
      return failure(
        new ProfileError(
          'duplicate_profile',
          `Profile ${profile.id} version ${profile.version} is already registered.`,
        ),
      );
    }

    registry.set(key, profile);
    return success(profile);
  }

  resolve<K extends ProfileKind>(
    kind: K,
    id: string,
    version?: string,
  ): Result<ProfileByKind[K], ProfileError> {
    const registry = this.profiles[kind] as Map<string, ProfileByKind[K]>;
    const profile = version
      ? registry.get(profileKey(id, version))
      : [...registry.values()].find((candidate) => candidate.id === id);

    if (!profile) {
      return failure(
        new ProfileError(
          'profile_not_found',
          version
            ? `Profile ${id} version ${version} was not found.`
            : `Profile ${id} was not found.`,
        ),
      );
    }

    return success(profile);
  }

  list<K extends ProfileKind>(kind: K): readonly ProfileByKind[K][] {
    return [...(this.profiles[kind] as Map<string, ProfileByKind[K]>).values()];
  }

  registerMany(profiles: readonly Profile[]): Result<readonly Profile[], ProfileError> {
    const registered: Profile[] = [];
    for (const profile of profiles) {
      const result = this.register(profile);
      if (!result.ok) {
        return result;
      }
      registered.push(result.value);
    }
    return success(registered);
  }
}
