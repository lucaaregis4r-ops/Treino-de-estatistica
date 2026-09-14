import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';
import type { AnalysisConfiguration } from '../../../domain/analytics/AnalysisConfiguration';

export interface AnalysisConfigurationRepository {
  save(configuration: AnalysisConfiguration): Promise<Result<void, RepositoryError>>;
  listByMatchId(matchId: string): Promise<Result<readonly AnalysisConfiguration[], RepositoryError>>;
  delete(id: string): Promise<Result<void, RepositoryError>>;
  deleteByMatchId(matchId: string): Promise<Result<void, RepositoryError>>;
}
