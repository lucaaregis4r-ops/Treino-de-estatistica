import type { TeamRepository } from '../../../application/ports/repositories/TeamRepository';
import type { Team } from '../../../domain/match/entities/Team';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { IndexedDbEntityRepository } from './IndexedDbEntityRepository';

export class IndexedDbTeamRepository
  extends IndexedDbEntityRepository<Team>
  implements TeamRepository
{
  constructor(database: ScoutTrainerDatabase) {
    super(database, STORE_NAMES.teams);
  }
}
