import type { MatchAnalyticsSnapshot } from '../../../domain/analytics/MatchAnalyticsSnapshot';
import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';

export interface AnalyticsSnapshotRepository {
  save(snapshot: MatchAnalyticsSnapshot): Promise<Result<void, RepositoryError>>;
  findById(matchId: string): Promise<Result<MatchAnalyticsSnapshot | null, RepositoryError>>;
  list(): Promise<Result<readonly MatchAnalyticsSnapshot[], RepositoryError>>;
  deleteByMatchId(matchId: string): Promise<Result<void, RepositoryError>>;
}
