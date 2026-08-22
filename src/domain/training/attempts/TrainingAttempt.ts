import type { CanonicalScoutEventCandidate } from '../../scout/mapper/CanonicalScoutEventCandidate';

export type TrainingErrorType = 'syntax' | 'player' | 'skill' | 'evaluation' | 'tactical';

export interface TrainingError {
  readonly type: TrainingErrorType;
  readonly code: string;
  readonly message: string;
}

export interface TrainingAttempt {
  readonly id: string;
  readonly exerciseId: string;
  readonly expectedEvent: CanonicalScoutEventCandidate;
  readonly receivedEvent?: CanonicalScoutEventCandidate;
  readonly receivedEvents?: readonly CanonicalScoutEventCandidate[];
  readonly rawInput: string;
  readonly correct: boolean;
  readonly startedAt: number;
  readonly submittedAt: number;
  readonly durationMs: number;
  readonly complete?: boolean;
  readonly tacticalDetailsCaptured?: number;
  readonly tacticalDetailsExpected?: number;
  readonly errors: readonly TrainingError[];
}
