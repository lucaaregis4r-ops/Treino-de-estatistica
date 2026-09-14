import type { Skill } from '../entities/Skill';
import type { ScoutEventMetadata } from '../events/ScoutEvent';

export interface CanonicalScoutEventCandidate {
  readonly playerNumber?: number;
  readonly skill: Skill;
  readonly evaluation: string;
  readonly outcome: string;
  readonly rawCode: string;
  readonly normalizedCode: string;
  readonly metadata?: ScoutEventMetadata;
}
