import type { MatchRepository } from '../../ports/repositories/MatchRepository';
import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';

export class CreateMatchUseCase {
  constructor(private readonly matches: MatchRepository) {}

  execute(metadata: MatchMetadata): Promise<Result<void, RepositoryError>> {
    return this.matches.save(metadata);
  }
}
