import type { TrainingSession } from '../../../domain/training/entities/TrainingSession';
import type { EntityRepository } from './EntityRepository';

export type TrainingSessionRepository = EntityRepository<TrainingSession>;
