import { describe, expect, it } from 'vitest';
import type { TrainingAttempt } from '../attempts/TrainingAttempt';
import { calculateTrainingPerformance } from './TrainingPerformanceMetrics';

function attempt(
  id: string,
  correct: boolean,
  durationMs: number,
  errorType?: 'syntax' | 'player',
  audit: { complete?: boolean; captured?: number; expected?: number } = {},
): TrainingAttempt {
  const expectedEvent = {
    playerNumber: 8,
    skill: 'serve' as const,
    evaluation: 'excellent',
    outcome: 'ace',
    rawCode: '08S#',
    normalizedCode: '08S#',
  };
  return {
    id,
    exerciseId: id,
    expectedEvent,
    rawInput: '',
    correct,
    startedAt: 0,
    submittedAt: durationMs,
    durationMs,
    complete: audit.complete ?? correct,
    tacticalDetailsCaptured: audit.captured ?? 0,
    tacticalDetailsExpected: audit.expected ?? 0,
    errors: errorType ? [{ type: errorType, code: errorType, message: errorType }] : [],
  };
}

describe('calculateTrainingPerformance', () => {
  it('calculates accuracy, timing, throughput, and categorized errors', () => {
    const metrics = calculateTrainingPerformance([
      attempt('1', true, 1000, undefined, { complete: true, captured: 4, expected: 4 }),
      attempt('2', false, 2000, 'syntax', { complete: false, captured: 0, expected: 4 }),
      attempt('3', true, 3000, undefined, { complete: false, captured: 2, expected: 4 }),
      attempt('4', false, 4000, 'player', { complete: true, captured: 4, expected: 4 }),
    ]);
    expect(metrics).toMatchObject({
      attempts: 4,
      correct: 2,
      accuracy: 0.5,
      averageTimeMs: 2500,
      medianTimeMs: 2500,
      eventsPerMinute: 24,
      completeness: 0.5,
      corrections: 2,
      correctionRate: 0.5,
      tacticalDetailsCaptured: 10,
      tacticalDetailsExpected: 16,
      tacticalDetailRate: 0.625,
      errors: { syntax: 1, player: 1, skill: 0, evaluation: 0 },
    });
  });

  it('returns unavailable ratios for an empty history', () => {
    expect(calculateTrainingPerformance([])).toMatchObject({
      attempts: 0,
      accuracy: null,
      averageTimeMs: null,
      medianTimeMs: null,
      eventsPerMinute: null,
      completeness: null,
      correctionRate: null,
      tacticalDetailRate: null,
    });
  });
});
