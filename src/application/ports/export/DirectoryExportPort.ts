import type { MatchExportBundle } from '../../ScoutTrainerService';
import type { RepositoryError } from '../../../core/errors/RepositoryError';
import type { Result } from '../../../core/result/Result';

export interface DirectoryExportPort {
  readonly supported: boolean;
  readonly connectedDirectoryName?: string;
  connect(): Promise<Result<string, RepositoryError>>;
  write(bundle: MatchExportBundle): Promise<Result<string, RepositoryError>>;
  disconnect(): void;
}
