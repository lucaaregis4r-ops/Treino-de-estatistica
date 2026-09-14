import type { ReportChartConfigurationRepository } from '../../../application/ports/repositories/ReportChartConfigurationRepository';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

export class IndexedDbReportChartConfigurationRepository implements ReportChartConfigurationRepository {
  constructor(private readonly database: ScoutTrainerDatabase) {}

  async save(configuration: ReportChartConfiguration): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.reportChartConfigurations, 'readwrite');
      transaction.objectStore(STORE_NAMES.reportChartConfigurations).put(configuration);
      await transactionDone(transaction, 'save report chart configuration');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not save report chart configuration.'));
    }
  }

  async listByMatchId(
    matchId: string,
  ): Promise<Result<readonly ReportChartConfiguration[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.reportChartConfigurations, 'readonly');
      const configurations = await requestResult<ReportChartConfiguration[]>(
        transaction.objectStore(STORE_NAMES.reportChartConfigurations).index('matchId').getAll(
          IDBKeyRange.only(matchId),
        ) as IDBRequest<ReportChartConfiguration[]>,
        'list report chart configurations by match id',
      );
      return success(configurations.sort((left, right) => left.order - right.order));
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not list report chart configurations.'));
    }
  }

  async delete(id: string): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.reportChartConfigurations, 'readwrite');
      transaction.objectStore(STORE_NAMES.reportChartConfigurations).delete(id);
      await transactionDone(transaction, 'delete report chart configuration');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not delete report chart configuration.'));
    }
  }

  async deleteByMatchId(matchId: string): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.reportChartConfigurations, 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.reportChartConfigurations);
      const keys = await requestResult<IDBValidKey[]>(
        store.index('matchId').getAllKeys(IDBKeyRange.only(matchId)),
        'find report chart configurations by match id',
      );
      keys.forEach((key) => store.delete(key));
      await transactionDone(transaction, 'delete report chart configurations by match id');
      return success(undefined);
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not delete report chart configurations.'));
    }
  }

  private repositoryError(error: unknown, message: string): RepositoryError {
    return error instanceof RepositoryError
      ? error
      : new RepositoryError('database_operation_failed', message, error);
  }
}
