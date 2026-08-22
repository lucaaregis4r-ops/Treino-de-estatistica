import type { FreeLogSessionRepository } from '../../../application/ports/repositories/FreeLogSessionRepository';
import type { FreeLogSession } from '../../../domain/free-log/FreeLogSession';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { IndexedDbEntityRepository } from './IndexedDbEntityRepository';

export class IndexedDbFreeLogSessionRepository
  extends IndexedDbEntityRepository<FreeLogSession>
  implements FreeLogSessionRepository
{
  constructor(database: ScoutTrainerDatabase) {
    super(database, STORE_NAMES.freeLogSessions);
  }
}
