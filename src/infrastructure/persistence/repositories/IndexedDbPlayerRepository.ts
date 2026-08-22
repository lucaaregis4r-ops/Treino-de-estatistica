import type { PlayerRepository } from '../../../application/ports/repositories/PlayerRepository';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import type { Player } from '../../../domain/match/entities/Player';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult } from '../indexeddb/idbRequests';
import { IndexedDbEntityRepository } from './IndexedDbEntityRepository';

export class IndexedDbPlayerRepository
  extends IndexedDbEntityRepository<Player>
  implements PlayerRepository
{
  constructor(database: ScoutTrainerDatabase) {
    super(database, STORE_NAMES.players);
  }

  async listByTeam(teamId: string): Promise<Result<readonly Player[], RepositoryError>> {
    try {
      const database = await this.database.open();
      const transaction = database.transaction(STORE_NAMES.players, 'readonly');
      const players = await requestResult(
        transaction
          .objectStore(STORE_NAMES.players)
          .index('teamId')
          .getAll(IDBKeyRange.only(teamId)) as IDBRequest<Player[]>,
        'list team players',
      );
      return success(players.sort((left, right) => left.number - right.number));
    } catch (error) {
      return failure(this.repositoryError(error, 'Could not list team players.'));
    }
  }
}
