import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import type { EntityRepository } from './EntityRepository';

export type MatchRepository = EntityRepository<MatchMetadata>;
