import type { Result } from '../../../core/result/Result';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';
import type { RepositoryError } from '../../../core/errors/RepositoryError';

export interface ReportChartConfigurationRepository {
  save(configuration: ReportChartConfiguration): Promise<Result<void, RepositoryError>>;
  listByMatchId(matchId: string): Promise<Result<readonly ReportChartConfiguration[], RepositoryError>>;
  delete(id: string): Promise<Result<void, RepositoryError>>;
  deleteByMatchId(matchId: string): Promise<Result<void, RepositoryError>>;
}
