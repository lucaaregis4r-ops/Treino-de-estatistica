import type { AnalyticsSnapshotRepository } from '../../../application/ports/repositories/AnalyticsSnapshotRepository';
import type { MatchAnalyticsSnapshot } from '../../../domain/analytics/MatchAnalyticsSnapshot';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

export class IndexedDbAnalyticsSnapshotRepository implements AnalyticsSnapshotRepository {
  constructor(private readonly database: ScoutTrainerDatabase) {}

  async save(snapshot: MatchAnalyticsSnapshot): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analyticsSnapshots, 'readwrite');
      transaction.objectStore(STORE_NAMES.analyticsSnapshots).put(snapshot);
      await transactionDone(transaction, 'save analytics snapshot');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not save analytics snapshot.'));
    }
  }

  async findById(matchId: string): Promise<Result<MatchAnalyticsSnapshot | null, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analyticsSnapshots, 'readonly');
      const snapshot = await requestResult<MatchAnalyticsSnapshot | undefined>(
        transaction.objectStore(STORE_NAMES.analyticsSnapshots).get(matchId) as IDBRequest<
          MatchAnalyticsSnapshot | undefined
        >,
        'find analytics snapshot by match id',
      );
      return success(snapshot ?? null);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not find analytics snapshot.'));
    }
  }

  async list(): Promise<Result<readonly MatchAnalyticsSnapshot[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analyticsSnapshots, 'readonly');
      const snapshots = await requestResult<MatchAnalyticsSnapshot[]>(
        transaction.objectStore(STORE_NAMES.analyticsSnapshots).getAll() as IDBRequest<
          MatchAnalyticsSnapshot[]
        >,
        'list analytics snapshots',
      );
      return success(snapshots);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not list analytics snapshots.'));
    }
  }

  async deleteByMatchId(matchId: string): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analyticsSnapshots, 'readwrite');
      transaction.objectStore(STORE_NAMES.analyticsSnapshots).delete(matchId);
      await transactionDone(transaction, 'delete analytics snapshot');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not delete analytics snapshot.'));
    }
  }

  private repositoryError(error: unknown, message: string): RepositoryError {
    return error instanceof RepositoryError
      ? error
      : new RepositoryError('database_operation_failed', message, error);
  }
}
