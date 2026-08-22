import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';
import type { MatchEvent } from '../../../domain/match/events/MatchEvent';

export interface EventRepository {
  append(event: MatchEvent): Promise<Result<void, RepositoryError>>;
  appendMany(events: readonly MatchEvent[]): Promise<Result<void, RepositoryError>>;
  listByMatch(matchId: string): Promise<Result<readonly MatchEvent[], RepositoryError>>;
}
