import type { ProfileRepository } from '../../../application/ports/repositories/ProfileRepository';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { Profile, ProfileKind } from '../../../profiles/types';
import {
  STORE_NAMES,
  type ScoutTrainerDatabase,
  type StoreName,
} from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

interface StoredProfile {
  readonly key: string;
  readonly profile: Profile;
}

const PROFILE_STORES: Readonly<Record<ProfileKind, StoreName>> = {
  code: STORE_NAMES.codeProfiles,
  complexity: STORE_NAMES.complexityProfiles,
  competition: STORE_NAMES.competitionProfiles,
  training: STORE_NAMES.trainingProfiles,
};

function key(id: string, version: string): string {
  return `${id}@${version}`;
}

export class IndexedDbProfileRepository implements ProfileRepository {
  constructor(private readonly database: ScoutTrainerDatabase) {}

  async save(profile: Profile): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const storeName = PROFILE_STORES[profile.kind];
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put({ key: key(profile.id, profile.version), profile });
      await transactionDone(transaction, 'save profile');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not save profile.'));
    }
  }

  async find(
    kind: ProfileKind,
    id: string,
    version: string,
  ): Promise<Result<Profile | undefined, RepositoryError>> {
    try {
      const database = await this.database.open();
      const storeName = PROFILE_STORES[kind];
      const transaction = database.transaction(storeName, 'readonly');
      const record = await requestResult(
        transaction.objectStore(storeName).get(key(id, version)) as IDBRequest<
          StoredProfile | undefined
        >,
        'find profile',
      );
      return success(record?.profile);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not find profile.'));
    }
  }

  async list(kind: ProfileKind): Promise<Result<readonly Profile[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const storeName = PROFILE_STORES[kind];
      const transaction = database.transaction(storeName, 'readonly');
      const records = await requestResult(
        transaction.objectStore(storeName).getAll() as IDBRequest<StoredProfile[]>,
        'list profiles',
      );
      return success(records.map((record) => record.profile));
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not list profiles.'));
    }
  }

  private repositoryError(error: unknown, message: string): RepositoryError {
    return error instanceof RepositoryError
      ? error
      : new RepositoryError('database_operation_failed', message, error);
  }
}
