import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';
import type { Player } from '../../../domain/match/entities/Player';
import type { EntityRepository } from './EntityRepository';

export interface PlayerRepository extends EntityRepository<Player> {
  listByTeam(teamId: string): Promise<Result<readonly Player[], RepositoryError>>;
}
