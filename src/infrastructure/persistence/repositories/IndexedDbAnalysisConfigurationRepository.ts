import type { AnalysisConfigurationRepository } from '../../../application/ports/repositories/AnalysisConfigurationRepository';
import type { AnalysisConfiguration } from '../../../domain/analytics/AnalysisConfiguration';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

export class IndexedDbAnalysisConfigurationRepository implements AnalysisConfigurationRepository {
  constructor(private readonly database: ScoutTrainerDatabase) {}

  async save(configuration: AnalysisConfiguration): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analysisConfigurations, 'readwrite');
      transaction.objectStore(STORE_NAMES.analysisConfigurations).put(configuration);
      await transactionDone(transaction, 'save analysis configuration');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not save analysis configuration.'));
    }
  }

  async listByMatchId(
    matchId: string,
  ): Promise<Result<readonly AnalysisConfiguration[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analysisConfigurations, 'readonly');
      const configurations = await requestResult<AnalysisConfiguration[]>(
        transaction.objectStore(STORE_NAMES.analysisConfigurations).index('matchId').getAll(
          IDBKeyRange.only(matchId),
        ) as IDBRequest<AnalysisConfiguration[]>,
        'list analysis configurations by match id',
      );
      return success(configurations.sort((left, right) => right.updatedAt - left.updatedAt));
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not list analysis configurations.'));
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analysisConfigurations, 'readwrite');
      transaction.objectStore(STORE_NAMES.analysisConfigurations).delete(id);
      await transactionDone(transaction, 'delete analysis configuration');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not delete analysis configuration.'));
    }
  }

  async deleteByMatchId(matchId: string): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.analysisConfigurations, 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.analysisConfigurations);
      const keys = await requestResult<IDBValidKey[]>(
        store.index('matchId').getAllKeys(IDBKeyRange.only(matchId)),
        'find analysis configurations by match id',
      );
      keys.forEach((key) => store.delete(key));
      await transactionDone(transaction, 'delete analysis configurations by match id');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not delete analysis configurations.'));
    }
  }

  private repositoryError(error: unknown, message: string): RepositoryError {
    return error instanceof RepositoryError
      ? error
      : new RepositoryError('database_operation_failed', message, error);
  }
}
