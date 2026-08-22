import type { TrainingSessionRepository } from '../../../application/ports/repositories/TrainingSessionRepository';
import type { TrainingSession } from '../../../domain/training/entities/TrainingSession';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { IndexedDbEntityRepository } from './IndexedDbEntityRepository';

export class IndexedDbTrainingSessionRepository
  extends IndexedDbEntityRepository<TrainingSession>
  implements TrainingSessionRepository
{
  constructor(database: ScoutTrainerDatabase) {
    super(database, STORE_NAMES.trainingSessions);
  }
}
