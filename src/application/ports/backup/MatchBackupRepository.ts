import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';
import type { MatchExport } from '../../../infrastructure/export/json/MatchJson';

export interface MatchBackupRepository {
  restore(backup: MatchExport): Promise<Result<void, RepositoryError>>;
}
