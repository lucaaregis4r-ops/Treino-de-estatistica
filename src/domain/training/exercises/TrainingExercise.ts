import type { ScoutEventMetadata } from '../../scout/events/ScoutEvent';
import type { CanonicalScoutEventCandidate } from '../../scout/mapper/CanonicalScoutEventCandidate';

export type TrainingExerciseKind =
  | 'code'
  | 'serve_zones'
  | 'serve_direction'
  | 'reception'
  | 'attack_direction'
  | 'setter_call'
  | 'attack_combination'
  | 'rotation'
  | 'full_rally';

export interface TrainingExercise {
  readonly id: string;
  readonly kind: TrainingExerciseKind;
  readonly playerNumber: number;
  readonly playerLabel: string;
  readonly playerRoleLabel?: string;
  readonly skillLabel: string;
  readonly evaluationLabel: string;
  readonly expectedCode: string;
  readonly expectedEvent: CanonicalScoutEventCandidate;
  readonly expectedEvents: readonly CanonicalScoutEventCandidate[];
  readonly promptDetails: readonly string[];
  readonly inputHint: string;
  readonly metadata?: ScoutEventMetadata;
}
