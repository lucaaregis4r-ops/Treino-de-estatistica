import type { TrainingAttempt } from '../attempts/TrainingAttempt';
import type { TrainingExercise } from '../exercises/TrainingExercise';

export type TrainingSessionStatus = 'active' | 'completed';

export interface TrainingSession {
  readonly id: string;
  readonly profileId: string;
  readonly profileVersion: string;
  readonly complexityProfileId: string;
  readonly competitionProfileId?: string;
  readonly startedAt: number;
  readonly currentExerciseStartedAt: number;
  readonly currentExerciseIndex: number;
  readonly completedAt?: number;
  readonly status: TrainingSessionStatus;
  readonly exercises: readonly TrainingExercise[];
  readonly attempts: readonly TrainingAttempt[];
}
