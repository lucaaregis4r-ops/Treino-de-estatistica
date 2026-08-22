import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';

export interface EntityRepository<T extends { readonly id: string }> {
  save(entity: T): Promise<Result<void, RepositoryError>>;
  findById(id: string): Promise<Result<T | undefined, RepositoryError>>;
  list(): Promise<Result<readonly T[], RepositoryError>>;
}
