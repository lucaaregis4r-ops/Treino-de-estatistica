import type { TrainingAttempt, TrainingErrorType } from '../attempts/TrainingAttempt';

export interface TrainingPerformanceMetrics {
  readonly attempts: number;
  readonly correct: number;
  readonly accuracy: number | null;
  readonly averageTimeMs: number | null;
  readonly medianTimeMs: number | null;
  readonly eventsPerMinute: number | null;
  readonly completeness: number | null;
  readonly corrections: number;
  readonly correctionRate: number | null;
  readonly tacticalDetailsCaptured: number;
  readonly tacticalDetailsExpected: number;
  readonly tacticalDetailRate: number | null;
  readonly errors: Readonly<Record<TrainingErrorType, number>>;
}

export function calculateTrainingPerformance(
  attempts: readonly TrainingAttempt[],
): TrainingPerformanceMetrics {
  const durations = attempts.map((attempt) => attempt.durationMs).sort((a, b) => a - b);
  const totalDuration = durations.reduce((total, duration) => total + duration, 0);
  const middle = Math.floor(durations.length / 2);
  const median =
    durations.length === 0
      ? null
      : durations.length % 2 === 0
        ? ((durations[middle - 1] ?? 0) + (durations[middle] ?? 0)) / 2
        : (durations[middle] ?? null);
  const errors: Record<TrainingErrorType, number> = {
    syntax: 0,
    player: 0,
    skill: 0,
    evaluation: 0,
    tactical: 0,
  };
  attempts
    .flatMap((attempt) => attempt.errors)
    .forEach((error) => {
      errors[error.type] += 1;
    });
  const complete = attempts.filter((attempt) => attempt.complete ?? attempt.correct).length;
  const corrections = attempts.filter((attempt) => !attempt.correct).length;
  const tacticalDetailsCaptured = attempts.reduce(
    (total, attempt) => total + (attempt.tacticalDetailsCaptured ?? 0),
    0,
  );
  const tacticalDetailsExpected = attempts.reduce(
    (total, attempt) => total + (attempt.tacticalDetailsExpected ?? 0),
    0,
  );

  return {
    attempts: attempts.length,
    correct: attempts.filter((attempt) => attempt.correct).length,
    accuracy:
      attempts.length === 0
        ? null
        : attempts.filter((attempt) => attempt.correct).length / attempts.length,
    averageTimeMs: attempts.length === 0 ? null : totalDuration / attempts.length,
    medianTimeMs: median,
    eventsPerMinute: totalDuration === 0 ? null : attempts.length / (totalDuration / 60_000),
    completeness: attempts.length === 0 ? null : complete / attempts.length,
    corrections,
    correctionRate: attempts.length === 0 ? null : corrections / attempts.length,
    tacticalDetailsCaptured,
    tacticalDetailsExpected,
    tacticalDetailRate:
      tacticalDetailsExpected === 0 ? null : tacticalDetailsCaptured / tacticalDetailsExpected,
    errors,
  };
}
