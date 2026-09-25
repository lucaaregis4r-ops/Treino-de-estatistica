import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { EntityRepository } from '../../../application/ports/repositories/EntityRepository';
import type { ScoutTrainerDatabase, StoreName } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

export class IndexedDbEntityRepository<
  T extends { readonly id: string },
> implements EntityRepository<T> {
  constructor(
    protected readonly database: ScoutTrainerDatabase,
    protected readonly storeName: StoreName,
  ) {}

  async save(entity: T): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(this.storeName, 'readwrite');
      transaction.objectStore(this.storeName).put(entity);
      await transactionDone(transaction, `save ${this.storeName}`);
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, `Could not save ${this.storeName} entity.`));
    }
  }

  /**
   * Saves a roster as one IndexedDB transaction. Repeating the same entity ids
   * is an upsert, which makes retrying a failed UI submission idempotent.
   */
  async saveMany(entities: readonly T[]): Promise<Result<void, RepositoryError>> {
    if (!entities.length) return success(undefined);
    try {
      const database = await this.database.open();
      const transaction = database.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      for (const entity of entities) store.put(entity);
      await transactionDone(transaction, `save many ${this.storeName}`);
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, `Could not save ${this.storeName} entities.`));
    }
  }

  async findById(id: string): Promise<Result<T | undefined, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(this.storeName, 'readonly');
      const value = await requestResult(
        transaction.objectStore(this.storeName).get(id) as IDBRequest<T | undefined>,
        `find ${this.storeName}`,
      );
      return success(value);
    } catch (error) {
      return failure(this.repositoryError(error, `Could not find ${this.storeName} entity.`));
    }
  }

  async list(): Promise<Result<readonly T[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(this.storeName, 'readonly');
      const values = await requestResult(
        transaction.objectStore(this.storeName).getAll() as IDBRequest<T[]>,
        `list ${this.storeName}`,
      );
      return success(values);
    } catch (error) {
      return failure(this.repositoryError(error, `Could not list ${this.storeName} entities.`));
    }
  }

  protected repositoryError(error: unknown, message: string): RepositoryError {
    return error instanceof RepositoryError
      ? error
      : new RepositoryError('database_operation_failed', message, error);
  }
}
