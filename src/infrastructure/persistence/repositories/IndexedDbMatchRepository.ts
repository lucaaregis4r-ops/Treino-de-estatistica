import type { MatchRepository } from '../../../application/ports/repositories/MatchRepository';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { IndexedDbEntityRepository } from './IndexedDbEntityRepository';

export class IndexedDbMatchRepository
  extends IndexedDbEntityRepository<MatchMetadata>
  implements MatchRepository
{
  constructor(database: ScoutTrainerDatabase) {
    super(database, STORE_NAMES.matches);
  }
}
